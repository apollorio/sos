/**
 * VAULT IDENTITY (ADR-0007). No login: a 128-bit seed → Ed25519 signing keypair + AES-GCM KEK + vaultId.
 * Deterministic from the seed, so a Recovery Key (the seed in base32) restores the same vault on a new phone.
 * Uses WebCrypto only (browser and Node ≥ 20). Nothing here ever touches the network.
 */
/** WebCrypto wants views over a real ArrayBuffer (not SharedArrayBuffer). */
export type Bytes = Uint8Array<ArrayBuffer>;

const subtle = () => globalThis.crypto.subtle;
const enc = new TextEncoder();

// PKCS#8 prefix for an Ed25519 private key (RFC 8410): SEQUENCE { version 0, AlgorithmIdentifier {1.3.101.112}, OCTET STRING { OCTET STRING seed } }
const ED25519_PKCS8_PREFIX = Uint8Array.from([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20]);
const ED25519_SPKI_PREFIX = Uint8Array.from([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00]);

export interface VaultIdentity {
  vaultId: string;
  publicKeyB64u: string;
  sign(bytes: Bytes): Promise<string>; // base64url signature
  kek: CryptoKey; // AES-GCM 256, wraps per-episode DEKs (non-extractable)
}

export function newSeed(): Bytes {
  const s = new Uint8Array(16);
  globalThis.crypto.getRandomValues(s);
  return s;
}

/** Crockford-ish base32 (no I, L, O, U) in groups of 5 — the Recovery Key a person can write down or scan. */
const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export function seedToRecoveryKey(seed: Uint8Array): string {
  let bits = 0, acc = 0, out = "";
  for (const b of seed) { acc = (acc << 8) | b; bits += 8; while (bits >= 5) { out += B32[(acc >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += B32[(acc << (5 - bits)) & 31];
  return out.match(/.{1,5}/g)!.join("-");
}
export function recoveryKeyToSeed(key: string): Bytes {
  const clean = key.toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  const out: number[] = [];
  let bits = 0, acc = 0;
  for (const ch of clean) {
    const v = B32.indexOf(ch);
    if (v < 0) throw new Error("recovery key: invalid character");
    acc = (acc << 5) | v; bits += 5;
    if (bits >= 8) { out.push((acc >>> (bits - 8)) & 255); bits -= 8; }
  }
  const seed = Uint8Array.from(out.slice(0, 16));
  if (seed.length !== 16) throw new Error("recovery key: wrong length");
  return seed;
}

async function sha256(...parts: Uint8Array[]): Promise<Bytes> {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const buf = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { buf.set(p, o); o += p.length; }
  return new Uint8Array(await subtle().digest("SHA-256", buf));
}

export const b64u = {
  enc: (b: Uint8Array): string => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  dec: (s: string): Bytes => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0)),
};

export async function deriveIdentity(seed: Bytes): Promise<VaultIdentity> {
  if (seed.length !== 16) throw new Error("seed must be 16 bytes");
  const edSeed = await sha256(seed, enc.encode("sos-vault-ed25519-v1"));
  const pkcs8 = new Uint8Array(ED25519_PKCS8_PREFIX.length + 32);
  pkcs8.set(ED25519_PKCS8_PREFIX); pkcs8.set(edSeed, ED25519_PKCS8_PREFIX.length);
  const priv = await subtle().importKey("pkcs8", pkcs8, { name: "Ed25519" }, false, ["sign"]);
  // Public key: derive by importing the private key as JWK is not possible when non-extractable; so import an extractable copy once.
  const privX = await subtle().importKey("pkcs8", pkcs8, { name: "Ed25519" }, true, ["sign"]);
  const jwk = await subtle().exportKey("jwk", privX);
  const pub = b64u.dec(jwk.x!);
  const publicKeyB64u = b64u.enc(pub);
  const vaultId = seedToRecoveryKey(await sha256(pub)).replace(/-/g, "").slice(0, 26);

  const kekRaw = await subtle().importKey("raw", seed, "HKDF", false, ["deriveKey"]);
  const kek = await subtle().deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: enc.encode("sos-vault"), info: enc.encode("sos-vault-kek-v1") },
    kekRaw, { name: "AES-GCM", length: 256 }, false, ["wrapKey", "unwrapKey", "encrypt", "decrypt"],
  );
  return {
    vaultId,
    publicKeyB64u,
    async sign(bytes) { return b64u.enc(new Uint8Array(await subtle().sign({ name: "Ed25519" }, priv, bytes))); },
    kek,
  };
}

export async function verifySignature(publicKeyB64u: string, bytes: Bytes, sigB64u: string): Promise<boolean> {
  const pub = b64u.dec(publicKeyB64u);
  const spki = new Uint8Array(ED25519_SPKI_PREFIX.length + 32);
  spki.set(ED25519_SPKI_PREFIX); spki.set(pub, ED25519_SPKI_PREFIX.length);
  const key = await subtle().importKey("spki", spki, { name: "Ed25519" }, false, ["verify"]);
  return subtle().verify({ name: "Ed25519" }, key, b64u.dec(sigB64u), bytes);
}

export async function vaultIdFromPublicKey(publicKeyB64u: string): Promise<string> {
  return seedToRecoveryKey(await sha256(b64u.dec(publicKeyB64u))).replace(/-/g, "").slice(0, 26);
}

/** Signed request envelope: the server verifies sig over sha256(body) ∥ ts and rejects |now − ts| > 5 min. */
export async function signRequest(id: VaultIdentity, body: string, ts: number): Promise<{ vault: string; ts: number; sig: string }> {
  const digest = await sha256(enc.encode(body), enc.encode(String(ts)));
  return { vault: id.vaultId, ts, sig: await id.sign(digest) };
}
export async function verifyRequest(publicKeyB64u: string, body: string, ts: number, sig: string, now: number): Promise<boolean> {
  if (Math.abs(now - ts) > 5 * 60_000) return false;
  const digest = await sha256(enc.encode(body), enc.encode(String(ts)));
  return verifySignature(publicKeyB64u, digest, sig);
}

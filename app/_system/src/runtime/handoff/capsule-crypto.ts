/**
 * CAPSULE CRYPTO (ADR-0009). A random AES-GCM key seals the rendered summary; the key is returned base64url to be
 * placed in the URL fragment. The server stores {iv, ct} only. Opening happens in the recipient's browser.
 */
import { b64u } from "../trust/vault-identity";

const subtle = () => globalThis.crypto.subtle;
const enc = new TextEncoder();
const dec = new TextDecoder();

export interface SealedCapsule { v: 1; iv: string; ct: string }

export async function sealCapsule(plaintext: string): Promise<{ sealed: SealedCapsule; keyB64u: string }> {
  const raw = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const key = await subtle().importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext)));
  return { sealed: { v: 1, iv: b64u.enc(iv), ct: b64u.enc(ct) }, keyB64u: b64u.enc(raw) };
}

export async function openCapsule(sealed: SealedCapsule, keyB64u: string): Promise<string> {
  const key = await subtle().importKey("raw", b64u.dec(keyB64u), { name: "AES-GCM" }, false, ["decrypt"]);
  return dec.decode(await subtle().decrypt({ name: "AES-GCM", iv: b64u.dec(sealed.iv) }, key, b64u.dec(sealed.ct)));
}

export function newCapsuleId(): string {
  return b64u.enc(globalThis.crypto.getRandomValues(new Uint8Array(12)));
}

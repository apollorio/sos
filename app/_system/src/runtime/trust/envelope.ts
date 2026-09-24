/**
 * ENVELOPE ENCRYPTION (Blueprint v0.2 §6, D13). Client side: payload → AES-GCM(DEK); DEK wrapped by the vault KEK.
 * The server only ever sees {iv, ciphertext, wrappedDek}. Losing the seed loses the data — by design.
 */
import { b64u } from "./vault-identity";

const subtle = () => globalThis.crypto.subtle;
const enc = new TextEncoder();
const dec = new TextDecoder();

export interface Envelope { v: 1; iv: string; ct: string; dekIv: string; dek: string }

export async function newDek(): Promise<CryptoKey> {
  return subtle().generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function seal(plaintext: string, dek: CryptoKey, kek: CryptoKey): Promise<Envelope> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv }, dek, enc.encode(plaintext)));
  const dekIv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const wrapped = new Uint8Array(await subtle().wrapKey("raw", dek, kek, { name: "AES-GCM", iv: dekIv }));
  return { v: 1, iv: b64u.enc(iv), ct: b64u.enc(ct), dekIv: b64u.enc(dekIv), dek: b64u.enc(wrapped) };
}

export async function open(env: Envelope, kek: CryptoKey): Promise<string> {
  const dek = await subtle().unwrapKey("raw", b64u.dec(env.dek), kek, { name: "AES-GCM", iv: b64u.dec(env.dekIv) }, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const pt = await subtle().decrypt({ name: "AES-GCM", iv: b64u.dec(env.iv) }, dek, b64u.dec(env.ct));
  return dec.decode(pt);
}

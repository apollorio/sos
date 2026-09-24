# ADR-0007 · Pseudonymous vault identity (no login)

**Status:** accepted (v0.2) · **Laws:** L10, L20

## Context
Continuity needs "the same person across episodes for 180 days". Login, e-mail, phone, CPF and social identity are all
excluded by product decision and by the privacy posture (health + drug context are sensitive under LGPD).

## Decision
Identity is a 128-bit random seed held by the device. From it we derive deterministically: an Ed25519 keypair (request
signing), a KEK (AES-GCM 256, wraps per-episode DEKs) and `vaultId = base32(SHA-256(publicKey))`. The server authenticates
requests by signature against the registered public key. Recovery is a one-time, optional **Recovery Key** (the seed as
26 base32 chars / QR). Losing both device and key loses the vault; the app keeps working (L12).

## Consequences
- The server never learns who the person is; the only identifier is a public key hash.
- No password UX, no account screens, no e-mail deliverability, no SMS OTP (no SMS-pumping surface either, cf. ADR-0003).
- Ed25519 in WebCrypto is required (Chrome ≥ 137, Safari ≥ 17, Firefox ≥ 130). On older browsers the continuity plane simply
  stays local (L13); the acute plane is unaffected.

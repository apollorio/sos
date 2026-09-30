# ADR-0009 · Sharing through expiring capability links with the key in the URL fragment

**Status:** accepted (v0.2) · **Law:** L18 · **Invariant:** INV-026

## Context
A share must be initiated by the person or the current helper, scoped to an audience, expire quickly, be revocable and be
auditable — and the server should not be able to read what it stores.

## Decision
`sealCapsule(summary)` encrypts with a random AES-GCM key; the ciphertext is stored under a random capsule id with
`{audience, scopes, expiresAt, maxViews}`; the key travels only in the URL fragment (`/s/<id>#k=<key>`), which browsers never
send to the server. `openCapsule()` decrypts client side. Access events are logged in a separate audit table (not in the
episode journal). Revocation deletes the ciphertext.

## Consequences
- A leaked server database exposes ciphertext only. A leaked link is bounded by expiry, `maxViews` and revoke.
- Location, if included, is a separate scope chosen explicitly at share time.

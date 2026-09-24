# Vault protocol v1 (server side of Phases 6, 7, 9)

Transport: HTTPS, JSON. Auth: every request body is signed with the vault's Ed25519 key
(`X-SOS-Vault: <vaultId>`, `X-SOS-Sig: base64(sig(sha256(body)))`, `X-SOS-Ts: <unix ms>`; reject if |now − ts| > 5 min).

## Tables (D1)
`vaults(vault_id, public_key, created_at, last_seen_at, purge_at)` ·
`episodes(episode_id, vault_id, started_at, ended_at, highest_band, purge_at)` ·
`events(event_id PK, episode_id, client_seq, client_observed_at, server_received_at, kind, payload_enc, dek_wrapped, schema_version)` ·
`episode_snapshots(vault_id, snapshot_enc, updated_at)` · `strategy_history` (inside snapshot) ·
`share_capsules(capsule_id PK, audience, scopes, ciphertext, created_at, expires_at, revoked_at, max_views, views)` ·
`share_access_audit(capsule_id, opened_at, outcome)` · `consent_preferences(vault_id, continuity, emergency_passport, location, updated_at)` ·
`retention_jobs(ran_at, purged_events, purged_capsules)` · `security_events(at, ip_hash, kind)` — **never joined to health tables**.

## Endpoints
| Method | Path | Body | Semantics |
|---|---|---|---|
| POST | `/v1/vaults` | `{publicKey}` | idempotent registration; `vaultId` derived server side and must match the client's |
| PUT | `/v1/vaults/{id}/events` | `{events: JournalEventEnc[]}` (≤ 200) | append-only; duplicates by `event_id` are ignored and reported in `accepted[]`/`duplicate[]`; sets `server_received_at` |
| GET | `/v1/vaults/{id}/snapshot` | — | latest encrypted snapshot (client derives + uploads it; server never computes on plaintext) |
| PUT | `/v1/vaults/{id}/snapshot` | `{snapshotEnc}` | replace |
| DELETE | `/v1/vaults/{id}` | — | full purge, signed |
| POST | `/v1/capsules` | `{ciphertext, audience, scopes, ttlSec, maxViews}` | Turnstile-gated (only write that costs money); returns `capsuleId` |
| GET | `/v1/capsules/{id}` | — | ciphertext if not expired/revoked and `views < maxViews`; increments views; audit row |
| DELETE | `/v1/capsules/{id}` | — | revoke (signed by creator vault) |

## Invariants the server must uphold
- Never store request metadata (IP, UA) in health tables (INV-025).
- Never return another vault's events (signature ⇔ vaultId).
- Retention job daily: purge `events` past `purge_at`, expired capsules, security events > 30 d.
- No endpoint decides anything about care. There is no `/decide`.

## Conformance
`tests/continuity/sync.test.ts` exercises a `MemoryVaultServer` implementing exactly this contract; the Worker must pass
the same test file through an HTTP adapter before deployment.

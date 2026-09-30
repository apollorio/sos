# Threat model (Phase 1) — v0.2 continuity plane

| Asset | Threat | Mitigation | Status |
|---|---|---|---|
| Episode history (sensitive health + drug context) | server breach | client-side envelope encryption; server holds ciphertext + wrapped DEKs; KMS at rest | designed · server ☐ |
| Same | device theft | IndexedDB behind OS lock; `Apagar agora`; acute state 12 h | v0.1 ✔ |
| Same | legal compulsion / self-incrimination | no identity; substanceClass enum only; no free text; 180 d purge | ✔ design |
| Vault identity | key extraction | non-extractable CryptoKeys; seed shown once | ✔ |
| Share links | link leak | fragment key, 6 h default, `maxViews`, revoke, audit | ✔ design |
| Share creation | abuse / SMS-pumping | none possible: no SMS relay; capsule creation is the only write that costs money → Turnstile there only, never in P0/P1 | ✔ design |
| Availability | backend down | acute plane offline; sync queue; INV-019 | ✔ |
| Observability | health data in logs | single logger with allowlist (INV-025) | ✔ |
| History misuse | app asserts stale/derived history as fact | INV-020, INV-021, INV-022; buckets; evidence thresholds | ✔ |
| Diagnosis by pattern | "3 episodes ⇒ disorder" | L16, lexicon test INV-023 | ✔ |
| Clock skew | wrong phone clock reorders events | `clientSeq` + `clientObservedAt` + `serverReceivedAt` | ✔ |

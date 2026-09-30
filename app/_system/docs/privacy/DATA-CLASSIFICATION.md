# Data classification & retention matrix (Phase 2)

Machine version: `registry/registry.json → continuity.retention`. Principle: LGPD art. 6 III (necessidade) — only what is
pertinent, proportional and non-excessive for the purpose "remember what helped, so the person does not have to".

| Class | Examples | Store | Retention | Encryption | Leaves device? |
|---|---|---|---|---|---|
| **Acute state** | current `SessionState`, decision log | IndexedDB `sos-apollo` | 12 h · `Apagar agora` | at rest by OS | no |
| **Episode continuity** | journal events (enum signals + provenance, cards shown, outcomes, band transitions, commitments, handoffs), snapshot | IndexedDB `sos-apollo-vault` · remote vault | **180 d**, then purge job | client envelope (AES-GCM DEK ⟵ KEK) + server KMS | only with continuity consent |
| **Location** | explicit current location for a capsule | capsule only | episode / capsule expiry | inside capsule ciphertext | only inside a capsule the person creates |
| **Share capsule** | one rendered summary | server, ciphertext | 1 h / 6 h / 24 h, `maxViews`, revoke | AES-GCM key in URL fragment | yes, by explicit action |
| **Access audit** | capsule id, opened-at, count | server table `share_access_audit` | with the capsule | n/a (no health data) | yes |
| **Security log** | IP, rate-limit counters, signature failures | server table `security_events` | 30 d | n/a | yes |
| **Raw free text** | what the person typed | nowhere | 0 s (matched → trigger id) | — | never |
| **Never collected** | name, phone, e-mail, CPF, face, voice, contacts, continuous GPS, push tokens, fingerprint | — | — | — | — |

Retention jobs run server side (`retention_jobs`) and client side (on vault open). Both are idempotent.

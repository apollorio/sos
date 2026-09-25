# SOS Apollo · Blueprint v0.2 — Continuity

> **A privacy-preserving adaptive support system with a deterministic acute-care core and a pseudonymous 180-day
> continuity vault: it remembers what happened, what helped, what changed and what may be useful to a trusted person or a
> health professional — without identity, social login, face, voice or permanent profiling.**

v0.1 (`BLUEPRINT.md`) is frozen and stays the heart. v0.2 **surrounds** it. Nothing in this document changes a decision the
acute core makes today; everything here is proven not to (see §12).

---

## 0 · Status of this plan

| Phase | Scope | Status | Evidence |
|---|---|---|---|
| 0 | Freeze v0.1 core | ✔ | `npm run verify` green on the base commit; exhaustive 3.15 M states passing |
| 1 | Threat model + LGPD/RIPD | ✔ skeleton | `docs/privacy/RIPD.md`, `docs/privacy/THREAT-MODEL.md` |
| 2 | Data classification / retention matrix | ✔ client · ☐ server job | `registry.continuity.retention`, `docs/privacy/DATA-CLASSIFICATION.md`; expired episodes are deleted from local storage on every refresh (`boot-continuity.ts`, `tests/continuity/vault-store.test.ts`) — corrected 2026-09-25, before that the purge was in-memory only |
| 3 | Anonymous vault identity | ✔ tests · ☐ production | `src/runtime/trust/vault-identity.ts` + `tests/trust`; not instantiated in production (`boot.ts` passes `identity=null`), no recovery-key UI |
| 4 | Crypto architecture | ✔ client side | `src/runtime/trust/envelope.ts`, `src/runtime/handoff/capsule-crypto.ts`; KMS side in `docs/api/VAULT-PROTOCOL.md` |
| 5 | Event schema v2 (journal, two clocks, provenance) | ✔ | `src/core/journal/*`, `src/core/domain/provenance.ts` |
| 6 | Offline sync queue | ✔ | `src/runtime/continuity/sync.ts` (idempotent, append-only, never gates) |
| 7 | Continuity Vault (local + protocol) | ✔ local store · ☐ consent UI · ☐ server | `src/runtime/continuity/journal-store.ts` (serialized ops, quarantine, per-episode erase), `docs/api/VAULT-PROTOCOL.md`. Without a consent card nothing is ever written in production (D11) |
| 8 | Deterministic episode summaries | ✔ | `src/core/handoff/summary.ts` + `tests/handoff` |
| 9 | Share capsules / Crisis Passport | ✔ types + crypto + policy · ☐ share UI · ☐ server · ☐ `/s/` page | `src/core/handoff/capsule.ts`, `src/runtime/handoff/capsule-crypto.ts`; reachable only from the simulator |
| 20 (early) | Longitudinal personalization (strategy priors) | ✔ | `src/core/continuity/priors.ts`, `strategySkill` reorder, property tests. Contraindications that priors must never override are data (INV-027) since 2026-09-25 |
| 10–19, 21–26 | Human State v2, Belief Engine, Need Map, VOI v2, Packs, Programs, Care Router, QA, reviews | ☐ | §13 gives file-level specs |

---

## 1 · The two planes

```
┌─────────────────────────────────────────────┐
│              ACUTE SAFETY PLANE             │  src/core (v0.1) — untouched decision loop
│ deterministic · offline · instant · local   │  ingest → reduce → time/TTL → hard rules → band → VOI → policy → skill → card
│ MUST WORK IF THE SERVER IS DEAD (L13, L19)  │
└──────────────────────┬──────────────────────┘
                       │ StepResult (state, output, log, events)   ← the only thing that crosses
                       ▼
┌─────────────────────────────────────────────┐
│             CONTINUITY PLANE                │  src/core/journal · src/core/continuity · src/core/handoff  (pure)
│ journal · snapshot · priors · summaries     │  src/runtime/continuity · src/runtime/trust · src/runtime/handoff (impure)
│ MUST NEVER CONTROL P0 (INV-019, INV-021)    │
└─────────────────────────────────────────────┘
```

The continuity plane **reads** `StepResult` and **writes back exactly one thing**: `priors` (§8), which can only reorder
strategies that are already eligible. That is the whole coupling, and it is tested by property (§12).

---

## 2 · Four stores, not one database

| Store | Lives in | Holds | Retention | Registry key |
|---|---|---|---|---|
| **Acute State** | IndexedDB `sos-apollo/kv` (v0.1) | `SessionState`, decision log | 12 h, `Apagar agora` | `storage.retentionHours` |
| **Continuity Vault** | IndexedDB `sos-apollo-vault/journal` locally; encrypted remote (§6) | journal events, snapshot, strategy history | **180 days** | `continuity.retention.journalDays` |
| **Share Capsules** | server (ciphertext only); key in URL fragment | one crisis summary per capsule | 1 h / 6 h / 24 h, revocable, `maxViews` | `continuity.share` |
| **Security Log** | server, separate table, never joined to health data | IP, rate-limit counters, abuse | 30 days | `continuity.retention.securityLogDays` |

**IP is never health state.** The vault protocol (§6) forbids the server from writing request metadata into `events`.

---

## 3 · Retention matrix (Phase 2)

Strong memory ≠ indiscriminate memory (LGPD necessity principle). What deserves 180 days:

| Datum | 180 d | Notes |
|---|---|---|
| episode start/end, entry intent, highest band, actor transitions | ✔ | |
| reported signals (enum values) with time + provenance | ✔ | never the free text that produced them |
| interventions offered / done / failed / declined, and reported trend after each | ✔ | this is the strategy evidence |
| commitments, handoffs opened, "Já liguei", help on scene | ✔ | observed taps, not claims (L01) |
| P0 / band transitions | ✔ | |
| precise location | ✖ | episode-only, explicit, encrypted, separate field (`continuity.retention.locationPolicy`) |
| IP, user-agent, referrer, fingerprint, push tokens | ✖ | security log, 30 d, separate |
| raw free text | ✖ | matched → trigger id → discarded (`rawTextDays = 0`) |

`docs/privacy/DATA-CLASSIFICATION.md` is the human-readable version; `registry.continuity.retention` is the machine one.

---

## 4 · Event schema v2 — the journal (Phase 5)

Every `processEvent` step yields zero or more **journal events**, derived purely (`src/core/journal/journal.ts`):

```ts
interface JournalEvent {
  eventId: string;          // `${episodeId}:${clientSeq}` — idempotency key
  episodeId: string;        // = sessionId of the acute plane
  clientSeq: number;        // strictly increasing per episode
  clientObservedAt: number; // the phone's clock (RawInput.at)
  serverReceivedAt: number | null; // filled by the vault on accept — two clocks, never one
  kind: JournalKind;        // EPISODE_STARTED · SIGNAL_REPORTED · CARD_SHOWN · BAND_CHANGED · STRATEGY_OUTCOME · ...
  origin: "self" | "helper" | "runtime" | "derived";
  provenance: Provenance;   // user_explicit · helper_explicit · runtime_observed · derived
  confidenceClass: "explicit" | "derived" | "unknown";
  payload: Record<string, string | number | boolean | null>;  // enums, ids, timestamps — NEVER text
  schemaVersion: 2;
}
```

Rules: append-only; corrections are events (`CORRECTION` stays in the journal next to the fact it reverses); duplicates are
ignored by `eventId`; a journal is byte-reproducible from the same `StepResult` sequence (property test).

**Facts, derivations and decisions are separate kinds.** `SIGNAL_REPORTED` (fact, explicit) ≠ `BAND_CHANGED` (derived) ≠
`CARD_SHOWN` (decision). A summary can therefore never present a derivation as something the person said (L15, INV-022).

---

## 5 · Anonymous vault identity (Phase 3)

```
seed (128-bit random)  ──►  Recovery Key: base32, 26 chars, shown ONCE as text + QR (optional to save)
      │
      ├─ SHA-256(seed ∥ "sos-vault-ed25519-v1") → Ed25519 private seed → keypair (request signing)
      ├─ HKDF(seed, "sos-vault-kek-v1")          → KEK (AES-GCM 256) — wraps per-episode DEKs
      └─ vaultId = base32(SHA-256(publicKey))[0:26]
```

- No login, no e-mail, no phone. The server sees `vault_…` and a signature. Authentication = `Ed25519(vaultPublicKey)`.
- New phone: type/scan the Recovery Key → same seed → same keys → same vault. Ignoring the key never blocks SOS (L12).
- Keys live in IndexedDB as non-extractable `CryptoKey`s; the seed is shown once and then only kept if the person chooses.

---

## 6 · Crypto + vault protocol (Phases 4, 6, 7)

- **Envelope encryption, client side:** episode payload → AES-GCM with a per-episode DEK → DEK wrapped by the vault KEK.
  The server stores ciphertext + wrapped DEK. It cannot read health data even if fully compromised.
- **Server side (KMS/HSM)** encrypts the blob again at rest and holds only the *operational* index (vaultId, episodeId,
  eventId, clientSeq, serverReceivedAt, purgeAt). `docs/api/VAULT-PROTOCOL.md` specifies `PUT /v1/vaults/{id}/events`
  (batch, signed, idempotent by eventId) and `GET /v1/vaults/{id}/snapshot`.
- **Sync queue** (`src/runtime/continuity/sync.ts`): after each commit, enqueue → flush when online → retry with backoff.
  A failed flush changes nothing on screen (INV-019). The queue is drained in order; the server ignores duplicates.
- **Observability firewall:** `src/runtime/observability.ts` is the only logger; it accepts an allowlist of operational
  fields and refuses anything from `SessionState`, journal payloads or summaries (INV-025, OWASP logging guidance).

---

## 7 · Continuity Snapshot (Phase 7)

Fast launch never replays 180 days. `deriveSnapshot(journal, now, reg)` (pure) produces:

```ts
interface ContinuitySnapshot {
  episodeCount180d: number; lastEpisodeAt: number | null; previousP0Count: number;
  strategyHistory: StrategyHistory[];       // offered · attempted · completed · outcome{better,same,worse,unknown} · lastUsedAt · bucket
  supportPatterns: { episodesAlone: number; improvedAfterSupport: number; declinedContact: number };
  recurring: { loudEnvironment: number; highAnxiety: number; unreality: number; lowAlertness: number };
}
```

Buckets are discrete (`RECENT ≤30 d`, `RELEVANT 31–90 d`, `OLD 91–180 d`) — no decimal weights, ever (B2).

---

## 8 · Longitudinal personalization = strategy priors (Phase 20, pulled forward)

`strategyPriors(snapshot, now, reg)` → `Record<StrategyKey, "helpful" | "unhelpful">` using registry evidence thresholds:

```
helpful    ⇔ attempted ≥ 3 ∧ better ≥ 2           (in RECENT ∪ RELEVANT; OLD only counts when nothing newer exists)
unhelpful  ⇔ attempted ≥ 3 ∧ better = 0 ∧ (worse + failed) ≥ 2
```

`strategySkill.select` walks the registry order, keeps only eligible strategies (unchanged function), then stably reorders:
helpful → neutral → unhelpful, **fallbacks (`alwaysEligible`) stay last**. Hence:

- **INV-020** history never populates a signal (priors are not facts; `applySignals` never sees them).
- **INV-021** historical preference < current contraindication (eligibility runs first, priors run after).
- Priors never touch hard rules, bands, the P0 commander or VOI-critical questions (property-tested).

---

## 9 · Crisis Passport (Phases 8, 9)

Deterministic templates only (ADR-0008). `buildCrisisSummary(journal, snapshot, audience, scopes, now, reg)` returns a
structured `CrisisSummary` with **`reported[]` and `derived[]` kept apart**, a `course[]` timeline and a `previous180d` block;
`renderSummary(summary, locale)` turns it into pt-BR text from `locales/pt-BR.json → continuity`.

| Audience | Scopes (default) | Tone |
|---|---|---|
| `trusted_person` | CURRENT_EPISODE (+ LOCATION_CURRENT only if explicitly chosen) | short, human, no vocabulary |
| `health_professional` | CURRENT_EPISODE · RECENT_CRISIS_HISTORY · STRATEGY_HISTORY · EXPOSURE_CONTEXT | reported vs derived, timeline, "user-reported data, clinical verification required" |

**Share capsule** (`src/core/handoff/capsule.ts`): `{ id, audience, scopes, createdAt, expiresAt, revokedAt?, maxViews? }`;
default 6 h, max 24 h, one-tap revoke, access audited separately from episode counts (§29 of the brainstorm).
**Capability link:** `https://sos.apollo.rio.br/s/<id>#k=<key>` — the fragment never reaches the server; the recipient's
browser downloads the ciphertext and decrypts locally (`src/runtime/handoff/capsule-crypto.ts`).

**Emergency Passport** (pre-authorized, OFF by default) is a consent preference (`continuity.consent.emergencyPassport`);
when on, helper mode may open a scoped summary on the person's own unlocked device. Never silently transmitted (L18, L20).

---

## 10 · Laws added (registry `laws`)

| | Law |
|---|---|
| L13 | Remote continuity can enrich decisions but never be required. |
| L14 | Historical information may influence; it may never become current fact. |
| L15 | Derived interpretations are never presented as user-reported facts. |
| L16 | No diagnosis is inferred from operational patterns. |
| L17 | Sensitive history is not analytics. |
| L18 | Sharing is scoped, expiring and auditable. |
| L19 | Emergency access never depends on network or backend. |
| L20 | Memory exists to reduce burden, not to increase surveillance. |

## 11 · Invariants added (registry `invariants`)

| INV | Statement | Enforced by |
|---|---|---|
| 019 | Continuity never gates: the card is decided before any journal/sync work; a sync failure changes no output. | engine-loop order · property (offline run ≡ online run) |
| 020 | Priors never write a signal; history never becomes a current fact. | types (priors are not `Op`s) · property |
| 021 | Historical preference < current contraindication: a prior can only reorder strategies that are already eligible. | property · exhaustive unaffected (no priors ⇒ identical) |
| 022 | Every journal event and every summary line carries provenance; reported and derived are never merged. | journal tests · summary tests |
| 023 | No diagnostic vocabulary in any generated summary (`continuity.forbiddenInference`). | lexicon test on locale + summarizer |
| 024 | Journal is append-only and idempotent by `eventId`; corrections are events. | property |
| 025 | Health state never reaches operational logs. | observability allowlist · architecture test on `src/runtime` |
| 026 | A share capsule is scoped, expires, is revocable, and its key lives only in the URL fragment. | capsule tests |
| 027 | Grounding respects physiology: no breath pacer unless breathing=normal ∧ responsive; no five_senses unless responsive. (Added after audit 003 — without it, INV-021 was vacuous for grounding.) | requirements · lint · runtime · exhaustive · scenarios |
| L10 guard | A non-P0 card shown to a helper resolves to helper-addressed copy unless declared actor-neutral. | `tests/invariants/perspective.ts` · exhaustive Tier A/B |

---

## 12 · Proof obligations (what `npm test` now checks in addition to v0.1)

- **Priors pass-through**: for random event sequences and random priors, `decideCore` band and commander are identical
  with and without priors; the chosen strategy is eligible; `priors = {}` is byte-identical to v0.1.
- **Journal determinism**: same `StepResult`s ⇒ byte-identical journal; duplicates ignored; sequence strictly increasing.
- **No text leakage**: a journal derived from runs that include free text never contains any of the input strings.
- **Summary separation**: every `reported` line traces to a `SIGNAL_REPORTED` with explicit provenance; every `derived` line
  to a `BAND_CHANGED`/`P0`; the rendered text contains no forbidden term.
- **Crypto round-trips** (Node WebCrypto): same seed ⇒ same vaultId; sign/verify; envelope encrypt/decrypt; capsule seal/open;
  expiry / revoke / maxViews enforced.
- **Architecture**: `src/core/journal`, `src/core/continuity`, `src/core/handoff` are pure (walked by the existing test).

---

## 13 · Roadmap — the 26 phases mapped onto this codebase

| # | Phase | Deliverable (files) | Exit criterion |
|---|---|---|---|
| 0 | Freeze v0.1 | this commit's base | verify green ✔ |
| 1 | Threat model + RIPD | `docs/privacy/THREAT-MODEL.md`, `docs/privacy/RIPD.md` | reviewed by a Brazilian privacy lawyer before any remote sync is enabled |
| 2 | Retention matrix | `registry.continuity.retention`, `docs/privacy/DATA-CLASSIFICATION.md` | lint: every journal kind has a retention class |
| 3 | Vault identity | `src/runtime/trust/vault-identity.ts` | recovery round-trip test |
| 4 | Crypto | `src/runtime/trust/envelope.ts`, `docs/api/VAULT-PROTOCOL.md` §KMS | round-trip tests; server design reviewed |
| 5 | Event schema v2 | `src/core/journal/*`, `src/core/domain/provenance.ts` | journal property tests |
| 6 | Sync queue | `src/runtime/continuity/sync.ts` | INV-019 property; offline ≡ online |
| 7 | Continuity Vault | `journal-store.ts` (local) → Cloudflare Worker + D1 (server, separate repo/dir `server/`) | snapshot in < 50 ms on low-end Android; server passes protocol conformance tests (`tests/continuity/sync.test.ts` fake) |
| 8 | Deterministic summaries | `src/core/handoff/summary.ts`, locale `continuity` | golden summaries + lexicon test |
| 9 | Share capsules | `src/core/handoff/capsule.ts`, `src/runtime/handoff/capsule-crypto.ts`, `/s/` static page | capsule tests; e2e open-by-fragment |
| 10 | Human State v2 | new neutral signals in registry: `orientation`, `perception`, `alertness`, `energy`, `connection`, `wantConversation`, `capacity` (+ questions, TTLs) | exhaustive still passes (state space grows: shard the enumeration by domain) |
| 11 | Belief Engine | `src/core/belief/patterns.ts` + `registry.beliefs` (predicates over facts+history → named operational patterns) | every belief is explainable from leaves; none writes a signal (INV-020) |
| 12 | Need Map | `registry.needs` (pattern → need → candidate skills); policies select by need instead of symptom | lint totality per band; scenarios |
| 13 | VOI v2 | `voi.ts`: simulate with priors + beliefs; "history-informed irrelevance" (don't re-ask what history + current facts settle) | VOI proof re-run (387 k states) |
| 14 | Pack framework | `registry.packs[]` = {entryIntent, signals, questions, policies, strategies, cards}; `scripts/registry-lint` per-pack totality | a pack is data only; no new linear flows |
| 15 | Hit Strong v2 | pack `hit_strong` (effects/mixed pattern, poison line, CANT_MOVE) | scenarios + clinical review |
| 16 | Unreality pack | pack `unreality` (orientation/perception; visual/tactile anchors) | scenarios + review |
| 17 | Loneliness pack | pack `loneliness` (connection ladder: near-people-without-talking before "call someone") | scenarios (uses priors: declinedContact) |
| 18 | Low Mood pack | pack `low_mood` (capacity signal → behavioral activation micro-steps) | scenarios; never a PHQ score in the acute path |
| 19 | Rescue/helper v2 | helper flows + Emergency Passport consent + scoped summary on device | e2e |
| 20 | Longitudinal personalization | **done early** (priors) + per-pack patterns from snapshot | property tests ✔ |
| 21 | Brazil Care Router | `registry.regions.BR.care` (SAMU · CVV · CAPS · UPA · Disque-Intoxicação; by need/severity/hour) — only verified directories (C4) | ops review |
| 22 | Programs | `src/core/programs/` runtime (deterministic structured programs: behavioral_activation, connection_ladder, post_peak_recovery, reflection) — NilaMind concepts, not code | P3 only; each program = data + scenario |
| 23 | Reviewed knowledge | `registry.knowledge[]` (retrieve-or-abstain, reviewed snippets; CBT vocab from cbt-llm-kit as vocabulary, not flow) | lint: every snippet has review status |
| 24 | Optional assessments | stable-state only (P3), never in P0–P2 | lint band gate |
| 25 | Adversarial QA | `tests/psychological-safety/` — invalidation · blame · gaslighting · false facts · overpathologizing · dependency · **history misuse · privacy surprise · over-sharing · false certainty · stale-history** (MHSafeEval taxonomy + ours) | all red cases blocked by lint/templates |
| 26 | Clinical / security / legal review | `docs/CLINICAL-REVIEW.md` sign-off · pentest of vault + capsules · RIPD approved | `registry:lint --release` green |

Donor repositories (NilaMind, CBT Assistant, cbt-llm-kit, MHSafeEval) enter **only after** phases 10–14 define the boundaries
they must fit into. SOS architecture decides what donor code may become.

---

## 13b · Known follow-ups from this build

- The engine bundle is now `app/assets/app.<hash>.js` (107 KB min) because the continuity plane is bundled with boot.
  Next step: load `src/runtime/continuity/boot-continuity.ts` through a dynamic `import()` after the first card (it is
  already attached after `js-ok`), keeping the acute bundle at ~80 KB.
- The simulator inlines ~127 KB of engine for the same reason; acceptable for an engineering tool.
- `demo/template.html` declares `<meta charset="utf-8">` (it did not before; any non-ASCII regex in the bundle broke).
- Deploys are content-addressed since 2026-09-25 (`scripts/build.ts`): hashed bundle + SRI + SW VERSION stamped from the
  shell's content; `npm run build:check` fails when the shell is stale; the e2e installs v1, deploys v2 and observes the update.
- Since audit 009 the shell lives at `app/` (served at `/app/`, the gateway at `/`) with relative paths, a `beta` channel
  notice stamped while the clinical release gate is red, and the beta lab at `app/lab/` (docs/BETA-LAB.md).
- Revoking continuity consent currently stops writing and clears priors but keeps what was stored; the consent UI phase
  must decide (with counsel, D18) whether revocation also erases the local vault.

## 14 · Decisions that need approval

| # | Decision | Recommendation |
|---|---|---|
| D11 | Continuity vault **opt-in** after a one-time calm privacy card (never in a crisis); acute plane works without it | approve |
| D12 | Recovery Key = 26-char base32 text + QR, optional to save; no e-mail/phone recovery | approve |
| D13 | Client-side envelope encryption (server never has plaintext), plus server KMS at rest | approve |
| D14 | Share capsule defaults: 6 h, max 24 h, maxViews 3, one-tap revoke | approve, tune in pilot |
| D15 | Evidence thresholds `attempted ≥ 3 ∧ better ≥ 2`; buckets 30/90/180 d | approve, tune in pilot |
| D16 | Location: `unavailable · approximate_region · explicit_current_location`, requested only when a capsule is created, never stored beyond the episode | approve |
| D17 | Server stack: Cloudflare Workers + D1 + KV (same edge as hosting), Turnstile only on capsule creation, never on read or in P0/P1 | approve |
| D18 | Legal basis for routine continuity = consent (Art. 11 I); protection of life (Art. 11 II e) reserved for acute processing only | validate with counsel |
| D19 | Emergency Passport OFF by default | approve |
| D20 | Journal never records `substanceClass` values beyond the class enum already in the registry; free-text exposure details never stored | approve |

---

## Sources

Same as v0.1, plus: LGPD (Lei 13.709/2018) arts. 6, 7, 11 · ANPD RIPD guidance · ANPD Res. CD nº 2/2022 (high-risk criteria) ·
OWASP Logging & Cryptographic Storage cheat sheets · MDN Geolocation (permission required) · WebCrypto Ed25519 / HKDF / AES-GCM.

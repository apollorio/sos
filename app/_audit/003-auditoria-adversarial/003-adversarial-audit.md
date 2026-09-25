# 003 · Independent adversarial architecture audit — SOS Apollo (2026-09-24)

Mode: STRICT / HOSTILE. Objective: disprove "the current codebase implements the architecture". Nothing in the repository
was modified during the audit; this file was written after it. Every conclusion cites executable code or a run.

---

## 0 · Inventory

```text
CURRENT COMMIT:     b2655f22b281ae8811b1cba21688372ff0b48431 (branch head)  · PR apollorio/sos#1 (draft)
BRANCH:             claude/connect-i913l0
UNCOMMITTED:        none (git status clean)
DIFF vs pre-impl:   102cdb7..HEAD — 64 files, +4473 / −124
MAIN RUNTIME ENTRY: app/_system/src/runtime/boot.ts → public/app.js (esbuild, 103.7 KB min)   ← NOT what the gateway serves
PRODUCTION ENTRY:   /index.html (gateway) → https://sos.apollo.rio.br/app/ → app/index.html + app/script.js (LEGACY 191-node flows)
MAIN BACKEND ENTRY: none. No server code exists. docs/api/VAULT-PROTOCOL.md is a specification only.
DATABASE:           none. IndexedDB "sos-apollo" (acute state, 12 h) and "sos-apollo-vault" (journal) in the browser.
REMOTE STORAGE:     none. `VaultClient` is an interface; only `MemoryVaultServer` (test double) implements it.
SERVICE WORKER:     app/_system/public/sw.js (engine only). Legacy /app has no service worker / manifest.
CI:                 none (.github/workflows absent). No deploy config (no netlify.toml / wrangler.toml / _redirects).
TEST COMMAND:       cd app/_system && npm test          → 13 files, 137 tests, all pass
VERIFY COMMAND:     cd app/_system && npm run verify    → exit 0 (registry:check · tsc · 137 tests · exhaustive 5/5 · build)
BUILD COMMAND:      cd app/_system && npm run build     → public/app.js 103.7 KB
E2E:                npm run e2e → 7/7 in Chromium (shell only)
DEPENDENCIES:       runtime deps: none. devDeps: typescript, vitest, esbuild, fast-check, ajv, tsx, playwright-core, @types/node
DONOR CODE:         none vendored (see §G)
```

Failing tests before continuing: **none**. That is the first thing to be suspicious about: the suite tests the engine in
`_system`, and the engine is not what production serves.

---

## 1 · The single most important finding

**The gateway sends every real user to the legacy flow app, not to the engine.**

- `/index.html` (gateway) links `https://sos.apollo.rio.br/app/` and `/somar/` (lines with `href="https://sos.apollo.rio.br/app/"`).
- `/app/index.html` loads `preloader.js`, `data.embed.js`, `script.js` (lines 38, 182, 183) plus third-party scripts:
  `https://cdn.apollo.rio.br/v1.0.0/core.js` (line 42), GSAP from cdnjs (44), remixicon from jsdelivr (40), Google Fonts (46–48).
- `app/_system/public/index.html` (the engine shell) is reachable from nothing. No deploy config maps it to any path.
- The legacy brain is `script.js`: JSON flows (`data.json`, 191 nodes, 7 flows), a session risk ladder
  `RISK_ORDER = ['IDLE','LOW','MODERATE','HIGH','EMERGENT']` (script.js:110), `localStorage.setItem('sos_flow_progress', …)`
  (script.js:485) that persists node + risk across days.

Consequence: every architecture claim below is evaluated **twice** — for the engine (`_system`) and for production (`/app`).
For production, the answer to "is global behaviour still a predefined sequence?" is **YES**.

---

## 2 · Flows removed as the brain?

| Target | Evidence | Status |
|---|---|---|
| Engine `_system` | `src/core/planner/decide.ts:103` hard rules → `:115` prerequisite → forced question → VOI (`rankQuestions`) → policy table (`reg.data.policies[band]`) → `SKILLS[rule.skill].select`. No `stepIndex`, no flow arrays; questions are chosen by counterfactual simulation (`src/core/planner/voi.ts`). Probe B2: self · calm · alone (P3) then free text "não consigo respirar" → `CARD_P0_CALL` (P0) in one step. | **VERIFIED** (entry never owns the session; P0 wins immediately) |
| Production `/app` | `script.js` renders `node.to`, `choices[].to`, `redirect` (audit 000 §C.2: 74 info · 56 task · 30 choice · 19 action · 12 redirect nodes). `panico` reaches a tel link after 18 steps (000-mapa-do-projeto.md:66). | **CONTRADICTED** (linear flows own the session) |
| "entry=hit_strong then low mood/isolation surfaces another need" | No pack/need layer exists; the engine has no low-mood signal at all (§10). | **MISSING** |

---

## 3 · Privacy perimeter

Search (agent, whole repo minus node_modules): zero hits for getUserMedia, MediaRecorder, SpeechRecognition, FaceDetector,
navigator.geolocation, watchPosition, gtag, GA, PostHog, Mixpanel, Amplitude, fbq, Hotjar, FullStory, Sentry, clarity.

| Item | Engine (`_system`) | Production (`/app`) |
|---|---|---|
| Third-party scripts on the crisis page | none; CSP `default-src 'self'` in `public/_headers` | **`https://cdn.apollo.rio.br/v1.0.0/core.js`** (app/index.html:42, also in root gateway), GSAP (cdnjs), remixicon (jsdelivr), Google Fonts, audio from assets.apollo.rio.br. `core.js` content is **not in the repository** → an external script with full DOM access to the crisis screen. Audit 000 (C2) reported it loads tracking + ~25 files; it is still loaded. **UNKNOWN / UNSAFE** |
| Security headers | `_headers`: CSP strict, `Permissions-Policy: geolocation=(), camera=(), microphone=()`, HSTS, no-referrer — **but only if `_system/public` is the site root; it is not.** | none (no `_headers` at repo root; gateway has 844 lines of inline CSS + 3 inline scripts, so the engine CSP could not even be applied to it) |
| Health state in storage | IndexedDB `state` (enums/ids/timestamps), wiped after 12 h (`session-store.ts:30`) | `localStorage.sos_flow_progress` = current node + session risk incl. `EMERGENT`, **no expiry** (script.js:485/498; removed only on explicit action :1107) |
| Contacts / location | none | `navigator.contacts.select` (script.js:1349, user-initiated); Google-Maps / Uber deep links carry the destination when tapped (1141–1149) |
| Telemetry receiving health payloads | none found | none found in repo; `core.js` cannot be audited |

`Permissions-Policy` is correct in the engine headers. **Nothing proves those headers are served on the production host.**

Verdict: Engine **VERIFIED** (by construction + `tests/architecture/boundaries.test.ts` + `tests/architecture/observability.test.ts`).
Production **FAIL** (external unauditable script, no CSP, persistent risk state).

---

## 4 · Acute plane vs continuity plane

- Order of a step, `src/runtime/engine-loop.ts:71–85`: `processEvent` (pure) → `await store.saveState` (:73) → `await store.appendLog` (:74)
  → `await runEffects` (:75) → `this.render(r)` (:76) → `scheduler.arm` (:77) → `journalStep`/`onJournal` (:81–83, `void`, not awaited).
- `processEvent` (`src/core/process-event.ts`) takes no async input; `decide()` at :83 receives only `opts.priors`, a
  precomputed value (`boot-continuity.ts:42`, synchronous getter).
- Sync: `SyncQueue.flush()` swallows every error (`sync.ts:57`); `attachContinuity` is called with `void` after `js-ok`
  (`boot.ts:37`). Test `tests/trust/vault.test.ts` "survives server failures": `failNext=1` → flush returns 0, pending unchanged.
- Property `tests/continuity/priors.property.test.ts` "empty priors ⇒ byte-identical to v0.1".

**VERIFIED**: remote/continuity work can never delay or change the card.

**Red-team downgrade (PARTIAL for the *local* path):** lines :73–74 `await` IndexedDB writes **before** render. `idbPut`
catches errors but has no timeout; a hung IDB transaction (storage pressure, corrupted DB, Safari ITP purge mid-write) would
delay the card indefinitely. The static shell (`public/index.html` tel:192, L11) still works, but the engine card would not.
No test covers a hanging store.

---

## 5 · 180-day continuity vault

| Claim | Evidence | Status |
|---|---|---|
| Remote vault | no server; `VaultClient` interface only; `MemoryVaultServer` implements **only** `push` — no snapshot, no capsule, no delete endpoints (`sync.ts`, no "capsule" string). `docs/api/VAULT-PROTOCOL.md` says "tests/continuity/sync.test.ts exercises exactly this contract" — that file does not exist; the push-only test lives in `tests/trust/vault.test.ts`. | **MISSING** (server) · **FALSE CLAIM** (conformance) |
| Local journal | `src/runtime/continuity/journal-store.ts` (IDB `sos-apollo-vault`, append idempotent, pending set) | VERIFIED in tests (memory store) · UNKNOWN in a browser (no e2e touches IDB vault) |
| Structured history (not raw text) | `journal.ts:39,46` `ID_LIKE` guard; property test "never contains free text" (150 runs) | **VERIFIED** |
| Retention/purge | `purgeExpired` (`retention.ts`) is used **only to filter in memory** for the snapshot (`boot-continuity.ts:35`, `snapshot.ts:20`). `store.replaceAll` is **never called** by any runtime path. Nothing ever deletes old events from IndexedDB. No scheduled job, no test of deletion from storage. | **DECLARED-ONLY** |
| User-triggered deletion | `VaultStore.wipe()` exists; **no UI action calls it** in production (only the simulator's "Apagar cofre") | **DEAD in production** |
| Consent | `continuity.consent.continuityDefault=false`; `boot-continuity.ts:44` returns early without consent; the `consentCard` copy exists in `pt-BR.json` but **no registry card / no renderer / no action** ever shows it or calls `setConsent`. | **DEAD**: in production the continuity plane can never be turned on |

Net: in production nothing is journaled beyond the in-memory `Journal` inside `EngineLoop`, which dies with the tab.
"180 days" is a constant with a pure filter behind it.

---

## 6 · Data minimization (every persisted field)

| Field | Stored where | Purpose | Retention | Necessary? | Sensitive? |
|---|---|---|---|---|---|
| `SessionState.signals[*]` (enums: responsiveness, breathing, chest, seizure, syncope, selfHarm, physicallyUnsafe, anxiety 0–4, noise, company, companion, substanceClass, reportedTrend, actor) | IDB `sos-apollo/state` | acute decisions | 12 h (`session-store.ts:30`), "Apagar agora" | yes | **yes** (selfHarm, substanceClass) |
| `LogEntry[]` (input summary string, event types, band, skill, why leaves) | IDB `sos-apollo/logs`, ≤500 | local explainability | 12 h | debatable (500 entries) | yes (trigger ids reveal "quero morrer" matched TT) |
| `cardHistory`, `seenInputIds`, commitments, timers | same | idempotency / stale taps | 12 h | yes | low |
| Journal events (kind, enum payload, provenance, two clocks) | IDB `sos-apollo-vault/journal` (only with consent → never in prod) | continuity | **declared 180 d, never purged** | yes if continuity is wanted | **yes** |
| `pending` event ids | same | sync | until synced (never) | — | no |
| `consent` prefs | same | — | — | yes | no |
| Raw free text | nowhere (`ingest.ts:55`) | — | 0 | — | — |
| IP / UA / referrer | nowhere client-side; server does not exist | — | — | — | — |
| Location | nowhere (only as a summary parameter at share time; no code path supplies it) | — | — | — | — |
| **Legacy** `sos_flow_progress` {flow, node, risk, ts} | `localStorage` | resume | **unbounded** | no (C9: resume-by-choice already implemented) | **yes** (risk EMERGENT, cssrs node ids) |
| **Legacy** `sos-arrival`, `sos-seen-intro`, `STORAGE_RISK` | sessionStorage | UX | tab | no | low |

IP is not mixed into health records anywhere (there is no server).

---

## 7 · Pseudonymous identity

`src/runtime/trust/vault-identity.ts`: seed 128-bit → `SHA-256(seed ∥ "sos-vault-ed25519-v1")` → Ed25519 PKCS#8 import (:67–70),
non-extractable signing key; `vaultId = base32(SHA-256(pub))[0:26]`; `signRequest/verifyRequest` with ±5 min window.
Tests `tests/trust/vault.test.ts`: same seed ⇒ same vaultId; tampered body / stale ts fail; foreign key rejected by
`MemoryVaultServer` and logged to `security[]`, not `events`.

- No name/email/phone/CPF anywhere: **VERIFIED** (grep; copy audit).
- Vault fetch by predictable UUID: **not possible** — there is no fetch endpoint at all (nothing to secure yet).
- Recovery key UX: **MISSING** (no UI; `seedToRecoveryKey` is called only in tests/derivation).
- `deriveIdentity` is **never called in production** (`boot.ts:37` passes `identity=null`). **DEAD in production.**

Status: implementation **VERIFIED in tests**, production **DEAD**.

---

## 8 · Cryptography

- WebCrypto only (`crypto.subtle`): Ed25519, HKDF-SHA-256 → AES-GCM-256 KEK (`vault-identity.ts:79`), AES-GCM DEK per
  envelope with fresh 12-byte IV (`envelope.ts`), `wrapKey/unwrapKey` (DEK/KEK separation real), capsule key = 32 random
  bytes (`capsule-crypto.ts:14`). No home-grown primitives. Base32 is an encoding, not crypto.
- Round-trip tests exist for all three (vault.test.ts, capsule.test.ts). Wrong KEK / wrong capsule key reject.
- Weaknesses: (1) Ed25519 seed derived by plain SHA-256 instead of HKDF (acceptable, non-standard); (2) an **extractable**
  copy of the private key is imported at :72 just to export the public key and is left to GC — unnecessary surface;
  (3) no key rotation, no re-wrap path; (4) server-side KMS exists only in prose; (5) Ed25519 WebCrypto availability on
  older Android WebViews is unverified (continuity would silently stay local — acceptable by L13, but untested).
- TLS/HSTS: declared in `_headers`, not provably served (§3).

Status: **PARTIAL** (sound client-side design; no production wiring; no rotation; no server half).

---

## 9 · Fact / derived / need / decision separation

- FACT vs DERIVED: `SignalRecord.source` (`user_explicit | text_trigger | derived_rule | system`); journal `provenance`
  (`provenance.ts`), summary keeps `reported[]` and `derived[]` apart (`summary.ts:94–99`); test "keeps reported and derived
  apart; every line traces to a journal event". **VERIFIED**.
- INV-012 `substanceClass` only from explicit answer: `signals-apply.ts` + runtime invariant + lint. **VERIFIED** (never inferred).
- No diagnosis stored: no such field exists; lexicon test `findForbiddenTerms` over locale + rendered summaries. **VERIFIED**.
- BELIEF/PATTERN layer: **MISSING**. NEED MAP: **MISSING**. The engine goes fact → risk vector (ordinal, `risk-vector.ts`)
  → band → policy → skill. The risk vector is an honest, explainable derived layer (`why.because` leaves) but it is not a
  named-pattern engine and there is no need abstraction between symptom predicates and skills (`P1-040: emotional≥3 → grounding`).

---

## 10 · Human-state model

14 signals only (registry lines 130–200): actor, responsiveness, breathing, chest, seizure, syncope, selfHarm,
physicallyUnsafe, anxiety, noise, company, companion, substanceClass, reportedTrend.
Absent: orientation, perception, alertness, activation, temperature, energy, sadness, hopelessness, capacity, connection
(wants conversation / presence), exposure-as-effects. **MISSING** (Blueprint v0.2 phase 10 — explicitly "☐").
There is no duplicate-state problem because there are no packs.

## 11 · Belief engine — **MISSING** (phase 11). ## 12 · Need map — **MISSING** (phase 12).

---

## 13 · VOI / Akinator

- Counterfactual simulation `rankQuestions` (`voi.ts`); classes critical/decisive/irrelevant; Tier B exhaustive test
  (`decision-space.test.ts:165`) over 387 k states. **VERIFIED (v1)**.
- "If asking exact substance does not change next action it is not asked": in P1/P2 it is not asked (probe G3; simulate
  output). **But** in P3 `steady_check.tips` varies by substance class (`CARD_STEADY_TIPS.variantKeys=["substance"]`,
  registry :448 `Q_SUBSTANCE` bands P2/P3), so the pick key differs ⇒ **the direct label question "Usou alguma coisa?" IS
  asked in P3** (probe G4: `check_later → CARD_Q_SUBSTANCE (VOI_DECISIVE)`). Consistent with L08, contrary to the v2 goal of
  indirect operational questions. No test asserts either way. **CONTRADICTED vs. v2 target; VERIFIED vs. v1.**

## 14 · Cognitive burden

Per-band budgets enforced by lint + runtime (`engagement`: P0 0 questions/≤200 chars; P1 2 in a row/3 answers/≤220;
P2 3/4/≤260; P3 2/4/≤320); INV-017 P0 never asks (exhaustive). No per-question burden attribute. **PARTIAL**.
Production legacy: `panico` runs "9 regulation techniques in a row" and 18 steps before a tel link (audit 000 §149/66). **FAIL**.

## 15 · Packs — **MISSING**. ## 16 · Skills vs programs

7 skills / 12 strategies (registry `skills`), 4 of 7 are pure data via `strategySkill` (`strategy-skill.ts`). No skill sprawl.
Programs: **MISSING** (phase 22). **PARTIAL** (vocabulary small and correct; programs absent).

---

## 17 · Grounding safety — **UNSAFE (data defect)**

`registry.json:929–960` grounding strategies: `breath_pacer`, `feet_floor`, `five_senses` all have `when: {always:true}`,
`requires: []`. Nothing references `signal.breathing` or `signal.responsiveness`.

Probe G1 (executed against the real engine): helper · responds normally · **breathing "strange" (abnormal)** · no red flags ·
anxious · quiet → `CARD_GROUNDING_BREATH grounding.breath_pacer` in P1 via `P1-040` (registry :1024).
Eligibility check at that state: `strategyIneligibility` = `null` for all three grounding strategies.

So: `breathing != normal` does **NOT** block `breath_pacer`. The only breathing guard is HR-002 (`severely_abnormal` → P0,
registry :574). A person with abnormal-but-not-severe breathing is offered a paced-breathing exercise. The v0.2 priors
property test proves "priors respect eligibility" — which is vacuous here because eligibility never encoded the
contraindication. `responsiveness=impaired` likewise never blocks `five_senses` (`requires: []`).
No `visual_anchor` / `tactile_anchor` / `orientation_here_now` alternatives exist.

**Status: CONTRADICTED / UNSAFE.** Fix is data-only (`when` predicates + a requirement `breathing_normal`) plus a scenario
and re-running the exhaustive suite (INV-006 analogue for breathing).

## 18 · "I can't" — **VERIFIED**

Scenario `cant-move` (`scenarios.ts:108`): relocate → `cant` → `in_place`; `STRATEGY_OUTCOME failed` → `blockedUntil = now+blockSec`
(`reducer.ts`, relocate `blockSec 1800`); INV-005 runtime + exhaustive. Reset by time (`nextWakeAt` includes `blockedUntil`).

## 19 · Social kernel — **PARTIAL**

`companion: none|coming|arrived`, commitments FRIEND_ARRIVAL/CONTACT_REPLY/RELOCATION/CHECK_IN (registry), chip
`CHIP_FRIEND_ARRIVED`, INVAL-001 `arrived ⇒ company=with_someone` immediately (registry :201; INV-004 runtime+property).
Scenario `self-alone-friend-coming` (:119): whatsapp → hidden → visible after 185 s → `confirm_commitment` resurfaces
(`P1-005`) → `someone_coming` → later chip `arrived` → P3. **VERIFIED** for "commitment survives unrelated cards".
Missing: `left`, `cancelled` as states (only `not_coming` action on CARD_CONFIRM_FRIEND), ETA classes (soon/minutes/long).

## 20 · Actor — **PARTIAL**

`actor` signal, per-actor question variants, helper copy variants (`variants.ts`), scenario `helper-unresponsive` (2 taps → P0,
HR-001; e2e "helper → 'Não responde' → P0"). No `ACTOR_CHANGED` event; `Q_ACTOR maxAsks 99` but it is a prerequisite asked only
while unknown (`decide.ts:115`, `prerequisite()`), and the signal has `ttl null` ⇒ **the phone cannot be handed over
mid-session**. Helper is never asked "how are you feeling" (Q_ANXIETY helper variant asks about the person; verified copy).

## 21 · Hit Strong — **CONTRADICTED**

Still keyed on exact class: `Q_SUBSTANCE` answers stim/downer/psychedelic/none/unknown (registry :448); `BR-P1-05`
`substanceClass=downer ∧ isolation≥2 → P1`; tips by class. No activation/alertness/temperature/mixed signals. `unknown` and
`mixed` collapse into one answer ("Não sei / misturei" → `unknown`, locale CARD_Q_SUBSTANCE). Never *infers* a drug (INV-012) — good —
but the model the brief asks for does not exist.

## 22 · Low mood — **MISSING**. ## 23 · Loneliness — **MISSING**

Probe G6: alone → WhatsApp → "nobody" (= "não tenho ninguém") → CVV 188 call card → Q_NOISE → grounding. There is no
"I don't want to talk" answer; refusal is modelled only as "has nobody", and the next move is still a call. No connection ladder.

## 24 · Unreality — **MISSING** (no `orientation`/`perception` signals; legacy `realidade` flow labels "despersonalização ou
desrealização" in prose — data.json:864 — framed as a defence, not a diagnosis; WATCH).

## 25 · Anti-dependency — **PARTIAL**

Exit affordances exist: `CARD_P0_HANDOVER: end_session`, `CARD_STEADY_CHECK: im_fine_end`, `CARD_SESSION_CLOSED`.
`helpOnScene` → handover. Copy audit found no "só eu / conte só comigo" in engine copy. Legacy `panico m1` says
"**Fique comigo.** Devagar." (data.json:564) — mild binding language on the crisis page. No "companion present ⇒ offer exit"
rule; no interaction-count guard.

## 26 · Longitudinal personalization

- History never becomes fact: priors are not `Op`s; `applySignals` never sees them; property "signal tables identical with and
  without priors" (`priors.property.test.ts`). **VERIFIED**.
- "Historically helpful breath exercise vs. current breathing abnormal" — **cannot be verified as intended**: because §17 shows
  breathing abnormal never blocks breath_pacer, the eligibility-first ordering (`strategy-skill.ts:17–19`) has nothing to
  block. The mechanism is right (eligibility runs before `reorderByPriors`; fallbacks stay last, `priors.ts:31`); the
  contraindication data is absent. **PARTIAL**.

## 27 · Strategy history — **VERIFIED (pure)**

`StrategyHistory {offered, attempted, completed, failed, declined, outcome{better,same,worse,unknown}, byBucket}`
(`continuity/types.ts`); thresholds `minAttempted 3 ∧ minBetterForHelpful 2` (registry `continuity.evidence`); tests
"2 episodes are not evidence, 3 with 2 better are"; recent beats old (`priors.ts:16`). No "preferredForever". Never fed by
production (§5).

## 28 · Continuity snapshot — **VERIFIED (pure) / DEAD (prod)**

`deriveSnapshot` → counts only; no personality/diagnosis fields. **But** it throws on a malformed event
(probe D: `TypeError: Cannot read properties of undefined (reading 'kind')` for an event without `payload`). In production the
throw is swallowed by `refresh().catch(() => undefined)` (`boot-continuity.ts:37`) ⇒ priors stay `{}` forever — the acute
plane is safe, the continuity plane silently dies. No quarantine of bad records, no schema validation on `readAll()`.

## 29 · Crisis passport — **VERIFIED (pure)**

Deterministic templates (`summary.ts`, locale `continuity.*`); reported/derived/course separated; disclaimer; `previous`
block only with scopes; golden/lexicon tests; date math is pure and cross-checked against `Date` (300 random instants).
No LLM in the repository at all (grep: no openai/anthropic/ollama/gpt). Not reachable from the production UI (no share action).

## 30 · Share security — **VERIFIED (policy+crypto) / MISSING (server, page)**

`newCapsule` clamps ttl ∈ {1,6,24} h, `maxViews ≤ 3`, scopes ⊆ audience∪optional; `capsuleAccess` expired/revoked/exhausted
(`capsule.ts:31–58`); key only in fragment (`capsuleLink`), test asserts ciphertext does not contain the key.
No `/s/<id>` page, no server, no access-audit table, no `noindex` on a page that does not exist. Capsule id = 12 random
bytes (base64url) — not sequential.

## 31 · Brazil care router — **MISSING**

Static numbers only: shell panel (192 · 188 · 0800 722 6001), P0 copy mentions 190 for violence, `crisis_line` (188) and
`call_poison` action. The primary UI shows one door (tel:192 bar + P0 card) — not a wall. Legacy has a 7-unit Rio CAPS list
(audit C4: unverified). No semantic routing, no provenance/last-reviewed dates.

## 32 · Donor repositories — see §G. **No code copied.**

## 33 · Knowledge layer — **MISSING** (steady_check.tips is static reviewed-as-draft copy). No LLM anywhere.

## 34 · Assessments

Engine: none. **Production legacy: a 6-question C-SSRS-structured flow (`cssrs`, data.json:2228–2561)** with no attribution,
no licensing note, reachable from `falar` (audit 000). Not gated by any acute-safety state. **FLAG** (licensing + placement).

## 35 · P0 commander — **VERIFIED**

`evaluateHardRules` first match in registry order (`hard-rules.ts`), `alsoMatchingHardRules` logged; exhaustive
"P0 precedence — every subset of emergency facts is commanded by the lowest-numbered rule" (`decision-space.test.ts:212–243`,
510 combos) — ran green in this audit (`npm run verify` exit 0).

## 36 · Silence / background / offline — **VERIFIED**

Distinct: `accrueSilence` only while visible (`time.ts`; INV-013 property), `APP_HIDDEN/VISIBLE` with `resumedAfterGap`
(`reducer.ts`), `CONNECTIVITY` only affects `requires: network` (`message_whatsapp`). Scenarios `background-is-not-silence`
(:153), `silence-after-medical-risk` (:164). Probe G7: OFFLINE changed nothing on a grounding card.

## 37 · Remote backend failure — **VERIFIED by absence**

No remote call exists on any acute path. `SyncQueue.flush` failure test. Cannot simulate DNS/500 against a server that does
not exist; the property that matters (no await on remote before render) holds structurally (§4).

## 38 · Historical data failure — **PARTIAL** (§28: no crash in prod because of a blanket catch; but no quarantine; simulator
would surface an unhandled rejection).

## 39 · Copy safety (agent audit of pt-BR.json + data.json)

Engine copy: no diagnosis, no blame, no dependency language, no dosing; 19 cards still `review: "draft"` (lint warnings).
Production legacy: **"Você não está em perigo real."** (data.json:564, panico m1) — a categorical safety guarantee on a
crisis page in a flow that reaches a tel link only after 18 steps and has no red-flag screen (audit C6 analogue for panico).
Given the population (stimulants + chest symptoms present as "panic"), this is a **FLAG**, not WATCH.
"despersonalização ou desrealização" (data.json:864) — clinical label in prose, framed as defence: WATCH.
"Sempre diminuiu antes." (data.json:1545): WATCH. C-SSRS without attribution: FLAG.

## 40 · Adversarial combinations — coverage table

| Case | Engine test? | Result |
|---|---|---|
| hit strong + alone + loud | `self-club-panic-loud`, `self-alone-friend-coming` | VERIFIED (relocate / contact) |
| hit strong + friend coming | `self-alone-friend-coming` | VERIFIED |
| hit strong + conflicting signs | no such signal model | MISSING |
| low mood + loneliness / refuses contact | no signals | MISSING |
| unreality ± oriented | no signals | MISSING |
| helper + unresponsive | scenario + e2e | VERIFIED |
| helper + breathing abnormal | probe G1 | **UNSAFE** (breath_pacer offered) |
| friend arrival during grounding | `grounding-rotation` + chip in `self-alone-friend-coming` | VERIFIED |
| background while friend ETA expires | `self-alone-friend-coming` (hidden 185 s → confirm) | VERIFIED |
| offline P0 | e2e "JS disabled: tel:192"; core has no network | VERIFIED |
| remote vault unavailable | vault.test "survives server failures" | VERIFIED (test double) |
| historically helpful but contraindicated | mechanism tested; contraindication absent (§17) | PARTIAL |
| old history becoming current state | priors property (signals identical) | VERIFIED |
| CANT_MOVE after relocate | `cant-move` | VERIFIED |
| breathing abnormal + grounding | none | **FAIL** |
| multiple P0 rules same tick | exhaustive :212 | VERIFIED |
| share capsule revoked | capsule.test | VERIFIED (pure) |
| 180 d expiry | snapshot.test (in-memory filter) | PARTIAL (no storage purge) |
| double tap | probe E: `DUPLICATE`, 0 events | VERIFIED |
| stale bundle after deploy | none | **FAIL** (§F.3) |

---

## 41 · RED TEAM AGAINST MY OWN AUDIT (§F)

Attempts to break each VERIFIED finding:

1. **"P0 never depends on the backend" — counterexample: local store hang.** `engine-loop.ts:73–74` awaits IDB before render
   with no timeout. Downgraded to PARTIAL for the engine card; the HTML shell still exposes tel:192 (INV-003, e2e "engine crash").
2. **"Continuity never gates" — counterexample: memory growth.** `EngineLoop.journal` (in-memory) grows without bound for the
   life of the tab (no cap, `appendEvents` keeps all). A 12-hour session with a TICK every ≤60 s (`deadline-scheduler`) yields
   thousands of `CARD_SHOWN`? No — `CARD_SHOWN` only on instance change, TICK produces no journal event; growth is bounded by
   human input. Not broken, but unbounded in principle; `SessionState.seenInputIds` is capped at 50, the journal is not.
3. **"Old cached bundle" — BROKEN.** `sw.js:2` `VERSION = "sos-apollo-v0.1.0"` with the comment "bumped by the build" — the
   build (`package.json` `build` script) does not touch it. `_headers` marks `/app.js` `immutable, max-age=31536000` while the
   file name carries no hash. After a deploy, clients keep the old `app.js` (SW cache-first, `ignoreSearch: true`) until
   `sw.js` itself changes. **A safety fix would not reach installed users.** Blueprint §14 "immutable hashed assets + SRI" is
   FALSE: no hash, no SRI attribute in `public/index.html:32`.
4. **"Priors reorder only" — attempted bypass via VOI.** With priors, `decideCore` keys differ ⇒ a question may become decisive
   that was irrelevant without history (or vice-versa). Band and commander are proven identical; *which question* is asked is
   not. Acceptable under L08, but the blueprint's wording "never changes what is asked" would be false — it does not say that.
   Not downgraded; documented.
5. **"Journal never contains text" — attempted forge.** A malicious card id? Card ids come from the registry (lint pattern
   `^CARD_[A-Z0-9_]+$`). `triggerId`, `questionId` likewise. `guardPayload` regex allows `¬` and `|` — harmless. Holds.
6. **"Capsule key never reaches the server" — attempted leak via Referer.** `Referrer-Policy: no-referrer` only if headers
   are served; fragments are never sent in Referer regardless. Holds. But `capsuleLink` is never used in production.
7. **Concurrent tabs.** Two tabs both run `EngineLoop` on the same IDB `state`: last writer wins; `seenInputIds` differ ⇒ each
   tab re-decides on its own snapshot. No lock, no `storage` event handling. Downgrade: acute plane **PARTIAL** under multi-tab
   (P0 latch would survive because both tabs read/write the latched signal, but a card shown in tab A can be answered in tab B
   with a stale instance id ⇒ rejected as STALE_CARD except 192 — safe by INV-015, confusing in practice).
8. **Clock skew.** `processEvent` guards monotonic `now = max(input.at, lastAt)` (`process-event.ts`). A phone clock jumping
   backwards freezes deadlines until it catches up — TTLs never fire early. Safe direction.
9. **Corrupted IndexedDB.** `loadState` returns whatever JSON is there; no schema validation; `s.status === "active"` check only.
   A truncated state (e.g. `signals` missing) would throw inside `processEvent` → `dispatch().catch` removes `js-ok` ⇒ fail to
   shell. Safe (L11), but the person loses the engine for that session with no "Começar de novo" offer. PARTIAL.
10. **Forged client event.** Everything is local; a forged event only harms the forger. The future server trusts signed
    batches — replay is prevented only by `eventId` dedupe, not by a nonce; ts window is 5 min. Acceptable for append-only.
11. **Hidden telemetry.** None in the engine; `core.js` on the production page is unauditable (§3). Stands as UNKNOWN.

---

## 42 · CASE AGAINST THIS ARCHITECTURE

| Criticism | Realistic failure | Current mitigation | Sufficient? | Stronger |
|---|---|---|---|---|
| Continuity vault = privacy risk | a subpoena or breach exposes 180 days of "selfHarm=yes" events for thousands of pseudonyms | client-side envelope crypto (server holds ciphertext); no identity | Partly: metadata (episode times, kinds, band changes in the clear on the wire? — `kind` and timestamps are **not encrypted** in `WireEvent`) | encrypt `kind` too; pad batches; no server until RIPD signed |
| 180 d excessive | most crisis recurrence signal is within weeks; 6 months multiplies breach blast radius | buckets 30/90/180, OLD counts only when nothing newer | No — retention is also unimplemented (§5) | 90 d default, 180 opt-in; real purge |
| Belief/need layers = hidden complexity | more predicates ⇒ larger exhaustive space, slower proofs, subtle precedence bugs | not built yet | n/a | shard the exhaustive enumeration per pack; lint totality per band |
| Pack coexistence = state explosion | 14 signals → 3.15 M states already; +7 signals ⇒ ×10³ | none | No | independence proofs per dimension; abstract interpretation |
| VOI asks too many questions | 5 taps to first action in panic; G4 shows a substance question in P3 | budgets per band | Partly | burden attribute; ask substance only when tips differ *and* user opts in |
| Historical anchoring | "five_senses helped 3×" keeps being offered although today the person is impaired | eligibility-first | **Insufficient today** because eligibility lacks the contraindications (§17) | encode breathing/responsiveness requirements; decay |
| Deterministic rigidity | no way to express "this person hates breathing exercises" beyond blocking for 30 min | strategy blocks, priors | Partly | explicit "never offer" preference (local, consented) |
| Remote memory undermines trust | "Nada sai deste aparelho" (shell copy) becomes false the day sync ships | consent default off | Only while sync doesn't exist | change the privacy line with the feature; visible data controls |
| Share capsules = disclosure risk | friend forwards link; 3 views in 6 h is enough to screenshot | expiry/maxViews/revoke | Partly | one-time view for professionals; watermarking is theatre — accept residual |
| Brazil routing goes stale | CAPS list wrong at 3 a.m. | none (list unverified, C4) | No | reviewed directory with dates; hide unverified |
| BA inappropriate in some states | activation pushed to a person in stimulant crash | not built | n/a | P3-only gate + capacity signal before any program |

## 43 · BEST DEFENSE

Serious and unmitigated today: grounding contraindication (§17), production = legacy flows with external script (§1, §3),
stale-bundle deployment (§F.3), consent/purge/identity dead in production (§5, §7). Adequately mitigated in design and
proven where built: acute plane purity and totality, P0 precedence, latch, silence/background separation, provenance
separation, no LLM, no free text, priors-cannot-escalate. The two-plane split is genuinely enforced by code order and by
property tests, not by comments. The honest reading: **the engine is a verified kernel with one data-level safety hole; the
product around it (deployment, consent UI, server, packs) does not exist yet, and the thing users actually open tonight is the
older flow app.**

---

## 44 · FINAL VERDICT

### A. EXECUTIVE VERDICT

```text
STRUCTURALLY MISALIGNED  (production)
PARTIALLY COMPLIANT      (engine `_system`, with one UNSAFE data defect)
```

### B. SCORECARD

| Area | Engine | Production |
|---|---|---|
| Acute Core | VERIFIED | FAIL (flows) |
| Offline Independence | VERIFIED (PARTIAL: local IDB await before render) | PARTIAL (no SW; CDN scripts required) |
| Privacy | VERIFIED (headers unproven) | FAIL (unauditable `core.js`, no CSP, persistent risk in localStorage) |
| Remote Continuity | PARTIAL (client only; consent dead) | FAIL |
| Encryption | PARTIAL (client verified; no rotation; no server) | FAIL (n/a) |
| Data Minimization | VERIFIED (purge DECLARED-ONLY) | FAIL |
| Fact/Belief/Need Separation | PARTIAL (fact/derived yes; belief/need no) | FAIL |
| Akinator VOI | VERIFIED (v1) · v2 CONTRADICTED | FAIL |
| Pack Architecture | FAIL (missing) | FAIL |
| Hit Strong | PARTIAL (class-keyed) | PARTIAL |
| Unreality | FAIL | PARTIAL (flow) |
| Loneliness | FAIL | PARTIAL (flow) |
| Low Mood | FAIL | PARTIAL (flow + C-SSRS) |
| Rescue | PARTIAL | PARTIAL |
| Social Kernel | PARTIAL | FAIL |
| Longitudinal Personalization | PARTIAL | FAIL |
| Crisis Passport | VERIFIED (pure) · unreachable | FAIL |
| Brazil Care Router | FAIL | FAIL |
| Anti-Dependency | PARTIAL | PARTIAL |
| Clinical Safety | **FAIL** (§17; 19 draft cards; HR-006/7/8 proposed) | FAIL ("não está em perigo real"; 18 steps to 192) |
| Donor Code Governance | VERIFIED (none copied; no LICENSE file) | PARTIAL (C-SSRS unattributed) |
| Testing | VERIFIED (137 + exhaustive + e2e) | FAIL (none) |

### C. TOP 10 FAILURES (ordered safety → privacy → architecture → correctness → product)

1. **SAFETY** — `grounding.breath_pacer` eligible with `breathing=abnormal` and `five_senses` with `responsiveness=impaired`
   (`registry.json:929–960` `when:{always:true}`, `requires:[]`; probe G1). No scenario covers it.
2. **SAFETY** — Production serves the legacy flow app: 18 steps to a tel link in `panico`, no red-flag screen, and the copy
   "Você não está em perigo real." (`app/data.json:564`).
3. **SAFETY** — Deployed engine bundles never update: `sw.js` VERSION constant + `_headers` `immutable` on an unhashed `/app.js`.
   Blueprint claim of hashed assets + SRI is false (`public/index.html:32`).
4. **PRIVACY** — `https://cdn.apollo.rio.br/v1.0.0/core.js` executes on the production crisis page (`app/index.html:42`) and on
   the gateway; contents not in repo; no CSP; audit-000 C2 still open.
5. **PRIVACY** — Legacy `localStorage.sos_flow_progress` persists node + `EMERGENT` risk indefinitely (`script.js:485`).
6. **PRIVACY/ARCHITECTURE** — Vault retention is DECLARED-ONLY: `store.replaceAll` never called; no purge, no deletion UI.
7. **ARCHITECTURE** — Continuity plane is DEAD in production: consent can never be granted (no card/UI), identity and client
   are `null` (`boot.ts:37`), so journal/priors/passport are simulator-and-test features.
8. **ARCHITECTURE** — Belief engine, need map, human-state v2, packs, programs, care router: MISSING (phases 10–24).
9. **CORRECTNESS** — `deriveSnapshot` throws on malformed events (probe D); prod swallows it and silently disables continuity.
10. **PRODUCT** — Clinical gate red: 19 cards `review: draft`, HR-006/007/008 `proposed`, `meta.status: draft`; C-SSRS in
    production without attribution; `Q_SUBSTANCE` direct label asked in P3.

### D. FALSE CLAIMS

| Claim | Where | Evidence against |
|---|---|---|
| "immutable hashed assets + Subresource Integrity" | docs/BLUEPRINT.md §14; registry `shield.v1.edge` | `/app.js` unhashed; no `integrity=` in `public/index.html:32`; SW VERSION never bumped |
| "`VERSION` … bumped by the build (hash of app.js + registry)" | `public/sw.js:2` comment | `package.json` build script only runs esbuild |
| "`tests/continuity/sync.test.ts` exercises exactly this contract" | docs/api/VAULT-PROTOCOL.md §Conformance | file does not exist; only `push` is exercised in `tests/trust/vault.test.ts`; no snapshot/capsule/delete endpoints in `MemoryVaultServer` |
| "Phase 7 Continuity Vault ✔ local" / "Phase 2 retention ✔" | BLUEPRINT-v0.2 §0 | storage purge never executed; no deletion path (§5) |
| "Phase 3 vault identity ✔" | BLUEPRINT-v0.2 §0 | never instantiated outside tests (`boot.ts:37` passes null) |
| "Every feature is demonstrable in demo/template.html — if it cannot be shown in the simulator it is not done" (CLAUDE.md rule 7) | CLAUDE.md | true for the simulator; but the simulator ≠ production; the rule hides the deployment gap |
| "Free, login-free, offline harm-control PWA" (config/README.md) | config/README.md | production /app has no manifest/SW (audit 000 design gaps) |
| "Historical preference < current contraindication" (L14/INV-021) proven | BLUEPRINT-v0.2 §8/§12 | the property proves ordering; the contraindications for grounding do not exist in data (§17) |

### E. DEAD / COSMETIC IMPLEMENTATIONS

- `attachContinuity` in production: identity `null`, client `null`, consent unreachable ⇒ nothing persists (`boot.ts:37`, `boot-continuity.ts:27,44`).
- `consentCard` locale entry: no registry card, no renderer, no action.
- `VaultStore.replaceAll`, `wipe` (vault): no runtime caller.
- `deriveIdentity`, `seedToRecoveryKey`, `signRequest`: tests + none in prod.
- `sealCapsule`/`capsuleLink`/`newCapsule`: simulator only.
- `docs/api/VAULT-PROTOCOL.md` endpoints other than `push`: prose only.
- `registry.continuity.share.optionalScopes.LOCATION_CURRENT`: no code path ever supplies a location.
- `_system/public/_headers`, `sw.js`, `manifest.webmanifest`: unreachable from the gateway.
- `steady_check.hold` `alwaysEligible` — live (needed for totality), not dead. `HR-006/007/008` — live but `proposed`.

### F. RED-TEAM FAILURES — see §41 (items 1, 3, 7, 9 downgraded findings).

### G. DONOR CODE PROVENANCE

| Donor | Copied code? | Reimplemented idea? | Files | License | Attribution correct? |
|---|---|---|---|---|---|
| NilaMind | no (grep: 0 hits in src) | not yet (phase 22 roadmap only) | docs/BLUEPRINT-v0.2 §13 | n/a | n/a |
| CBT Assistant | no | no | docs only | n/a | n/a |
| cbt-llm-kit | no | no | docs only | n/a | n/a |
| MHSafeEval | no | taxonomy named for future tests | docs only | n/a | n/a |
| OpenMind / SafeChat / Cactus | no | no | — | — | — |
| **Columbia C-SSRS** | **questions adapted** (data.json:2228–2561, 6 items) | yes | app/data.json | scale use requires permission/registration (verify) | **no attribution** |
| GSAP 3.12.2 | loaded from CDN | — | app/index.html:44 | GreenSock "no charge" license | none stated |
| remixicon, Google Fonts | loaded from CDN | — | app/index.html:40,48 | Apache-2.0 / OFL | none stated |
| Grok/v0 artifacts | own generated prototypes | — | app/_knowledge/artifacts, v0.zip | — | — |
| Repository itself | — | — | — | **no LICENSE file; package.json private** | — |

### H. DATA MAP (sensitive fields)

| Field | source | local storage | remote storage | retention | encryption | sharing | deletion |
|---|---|---|---|---|---|---|---|
| selfHarm / syncope / seizure / chest / breathing / responsiveness | explicit tap or text trigger id | IDB `sos-apollo/state` | none | 12 h | OS at rest | never (engine) | auto + "Apagar agora" |
| substanceClass | explicit answer only (INV-012) | same | none | 12 h (TTL 4 h in state) | OS | summary only with EXPOSURE_CONTEXT scope (unreachable) | same |
| anxiety, company, companion, noise, trend | explicit | same | none | 12 h | OS | — | same |
| trigger ids (e.g. TT for "quero morrer") | text match | IDB logs (≤500) | none | 12 h | OS | — | same |
| journal events (all above as enums + kinds + times) | derived from StepResult | IDB `sos-apollo-vault` **only with consent (unreachable)** | none | **declared 180 d, no purge** | none locally; envelope only on wire (unused) | capsule (unreachable) | `wipe()` uncalled |
| location | — | — | — | — | — | — | — |
| **legacy** flow node + risk | taps | `localStorage` | none | **unbounded** | none | — | manual only |

### I. DECISION TRACE EXAMPLES (real engine output, this audit)

1. **P0 (helper)**: tap `helper` → FACT actor=helper (+INVAL-003 company=with_someone) → risk.uncertainty → band P1 → VOI critical Q_RESPONDS
   → tap `none` → FACT responsiveness=unresponsive (latched) → HR-001 commander → P0 → `emergency_escalation.call` → CARD_P0_CALL →
   effects KEEP_AWAKE(on) → persisted state + log; journal: SIGNAL_REPORTED(user…helper_explicit), BAND_CHANGED(P1→P0, HR-001), CARD_SHOWN.
2. **Hit Strong (club panic)**: self → none → yes → high → alone → FACTS anxiety=3, company=alone → risk.emotional 3, isolation 3 →
   BR-P1-04 P1 (sticky) → no belief/need layer → policy P1-020 → `contact_trusted_person.message_whatsapp` → CARD_CONTACT_WHATSAPP
   (handoff wa.me) → commitment CONTACT_REPLY created on `open_whatsapp`. (scenario `self-alone-friend-coming`)
3. **Loneliness**: as (2) then tap `nobody` → STRATEGY_OUTCOME declined for both message strategies → `crisis_line` → CARD_CRISIS_LINE (tel:188)
   → next: Q_NOISE (decisive) → grounding. No "prefer presence without talk" path (MISSING).
4. **Low Mood**: **no trace possible** — no energy/sadness/capacity signal; self · calm path ends in `steady_check.check_later` → Q_SUBSTANCE → tips.
5. **Unreality**: **no trace possible** — no orientation/perception signal; would be routed as anxiety or clarity=hard.
6. **Helper/Rescue with abnormal breathing (defect)**: helper → normal → `strange` (breathing=abnormal) → none → anxious → quiet →
   risk.medical 3 → BR-P1-01 P1 sticky → policy P1-040 (emotional≥3) → `grounding.breath_pacer` → CARD_GROUNDING_BREATH. **Should not happen.**

### J. WHAT MUST BE FIXED BEFORE THE NEXT FEATURE

1. Registry: `grounding.breath_pacer.when = breathing=normal ∧ responsiveness=responsive`; `five_senses` requires `responsiveness=responsive`;
   add `feet_floor` as the fallback; scenario `abnormal-breathing-no-pacer`; re-run exhaustive. (data + 1 scenario)
2. Deployment integrity: hash `app.js` in its filename (or drop `immutable`), generate `sw.js` VERSION from the build hash, add SRI.
3. Decide what production is: either route the gateway to `_system/public` behind the clinical gate, or stop calling `_system` the app.
   Until then remove `core.js` from the crisis page or vendor it under CSP, and bound `sos_flow_progress`.
4. Either implement vault purge + deletion + consent card + recovery UI, or mark phases 2/3/7 "☐" in BLUEPRINT-v0.2 §0 (they are not done).
5. Add schema validation/quarantine on `VaultStore.readAll()` so one bad record cannot disable continuity.
6. Correct the false claims in §D (blueprint §14, sw.js comment, VAULT-PROTOCOL conformance line).

### K. WHAT CAN WAIT

Belief/need/pack layers (they are roadmap, not regressions); indirect substance questions; ETA classes; ACTOR_CHANGED;
key rotation; C-SSRS attribution (must precede any public release, not the next feature); LICENSE file; bundle size.

### L. FINAL ADVERSARIAL CONCLUSION

**Three most plausible betrayals tonight (current implementation):**

1. *A frightened person opens sos.apollo.rio.br on a phone in a club.* They get the legacy `panico` flow: an external `core.js`
   runs on the page, the copy tells them "Você não está em perigo real" before anything checks breathing or chest, and the tel
   link is 18 taps away. If it is a stimulant-related cardiac event, the app has argued against calling 192.
   *Evidence needed:* gateway routed to the engine (or the legacy flow given a red-flag screen at node a1 and a static crisis bar),
   `core.js` removed or audited under CSP, a Chromium e2e that reaches tel:192 in ≤2 taps from the production URL.
2. *A helper with the engine build reports the person "respira estranho".* Not severe enough for P0, so risk.medical=3 → P1 →
   the engine offers a paced-breathing exercise to someone whose breathing is abnormal, and any "history says breathing helped"
   prior would rank it first.
   *Evidence needed:* registry requirement `breathing_normal` on breath_pacer, an exhaustive/INV proof "breathing≠normal ⇒ no breath_pacer",
   and a golden scenario.
3. *A bug is fixed and deployed.* Installed PWAs keep the old `app.js` (SW cache-first, unchanging VERSION, `immutable` header)
   for up to a year; the fix reaches nobody who needs it, and the team believes it shipped.
   *Evidence needed:* build-time hash in `sw.js` and in the asset URL, an e2e that installs v1, deploys v2 and observes the update.

Everything the continuity plane promises (memory, passport, capsules) is currently **true only inside the simulator and the
test-suite**; no real person can consent to it, and nothing they generate is ever kept beyond the tab. That is safe — and it is
not the architecture claimed.

---

## Addendum — second pass (same commit b2655f2, re-audited at b517bd6; no code changed)

Additional red-team probes executed against the real runtime:

| Probe | Result | Effect on verdict |
|---|---|---|
| **R1 — hung local store.** `EngineLoop` with a `Store.saveState` that never resolves; `loop.start()` awaited 500 ms. | **0 render calls.** `engine-loop.ts:73` `await this.store.saveState(r.state)` precedes `this.render(r)` (:76). A stalled IndexedDB transaction (no timeout, no race) blocks the engine card indefinitely. The static shell tel:192 (`public/index.html`, e2e "engine crash") is the only survivor. | Engine **Offline Independence: VERIFIED → PARTIAL**. New blocker J-7: render before persistence, or bound the store with a timeout + memory fallback. |
| **R2 — `responsiveness=impaired` vs grounding.** self · no red flags · clarity "hard" · with · quiet; `strategyIneligibility` for all three grounding strategies. | `null` for `breath_pacer`, `feet_floor`, `five_senses` — nothing in the registry blocks cognitively demanding grounding for an impaired person (that path happened to pick `stay_close` via P1-050, but `P1-040 emotional≥3 → grounding` would fire the moment anxiety≥3 is reported). | Confirms §17 second half. **UNSAFE** stands. |
| **R3 — entry "hit strong" then isolation appears later.** loud+with → `grounding.breath_pacer` (P2); after `company` TTL (900 s) expires → `Q_RED_FLAGS_SELF` re-asked in P1 (uncertainty). | The engine re-triages from facts; no redirect hack, no flow ownership. | §2 engine finding **VERIFIED** (again). |
| **Correction — legacy "18 steps to 192".** BFS over `data.json → panico.nodes` (28 nodes, start `a1`): **no panico node contains a `tel:` link at all**. `app/index.html` **does** contain a static `tel:192` strip (added in audit phase 001 "Abraço"). | The earlier phrasing "the tel link is 18 taps away" is **withdrawn**: the number came from audit 000 (pre-001). Corrected finding: the *flow content* never offers 192, and the *page* always shows a static 192/188 strip — whether the strip stays visible/reachable while the bottom sheet is open is **UNKNOWN** (not executed). The copy "Você não está em perigo real." (data.json:564) remains a **FLAG** independent of tap distance. | Top-10 item 2 reworded; severity unchanged (false reassurance + no red-flag gate in the flow). |

Scorecard delta: Engine · Offline Independence → **PARTIAL**. Everything else unchanged. `npm run verify` re-run: exit 0.

---

## Remediation pass — 2026-09-25 (same branch; engine + production)

Every item below was re-verified by execution after the change: fast suite, exhaustive proof (Tier A/B/C, with two new
assertions), `npm run e2e` (real Chromium, 12 checks) and the new `npm run e2e:legacy` (production page, 9 checks).

### Blockers from §J

| J | Blocker | Status | Evidence |
|---|---|---|---|
| J1 | Grounding contraindications | **FIXED** | registry requirements `breathing_normal`, `responsive`; `breath_pacer` requires both, `five_senses` requires `responsive`; lint rule + runtime INV-027 + exhaustive assertion over every Tier-A state; scenarios `abnormal-breathing-no-pacer`, `impaired-no-five-senses`; fast sweep in `tests/invariants/actor-perspective.test.ts` |
| J2 | Deployment integrity | **FIXED** | `scripts/build.ts`: `public/assets/app.<sha256:12>.js`, `integrity="sha384-…"` on the module tag, SW `VERSION` stamped from the content of every shell file, SW install with `cache: "reload"`; `_headers`: `immutable` only on `/assets/*`, `no-cache` on `/`, `/index.html`, `/sw.js`; `tests/build/stamp.test.ts`; `npm run build:check`; e2e: a tampered bundle is refused (with a control proving the interception itself boots) and an installed v1 activates v2 and deletes the v1 cache |
| J3 | What production is | **DECIDED BY THE REPO'S RULES + HARDENED** | CLAUDE.md rule 8 forbids a public engine while `registry:lint --release` is red ⇒ the legacy page stays production for now. Hardened: crisis bar (188/192) in every flow; `sos_flow_progress` expires after 12 h; `npm run e2e:legacy`. `core.js` and the panic copy stay with the owner (below) |
| J4 | Vault purge / deletion / consent / recovery | **PARTIAL** | expired episodes are now deleted from storage on every refresh; "Apagar agora" erases the episode from the vault (`onWipe → removeEpisode`); vault operations serialized (an append racing an erase could resurrect it). Consent UI, recovery-key UI and server remain ☐ — now stated as such in the v0.2 status table |
| J5 | Quarantine of bad records | **FIXED** | `isJournalEvent`/`partitionRecords` on every read, malformed records moved to a quarantine key, snapshot tolerates payload-less events (red-team probe D); `tests/continuity/vault-store.test.ts` |
| J6 | False claims | **FIXED** | v0.2 status table (phases 2/3/7/9), VAULT-PROTOCOL conformance line, v0.1 §14 integrity row and bundle size, config README, CLAUDE.md |
| R1 | Hung IndexedDB held the card | **FIXED** | each step starts its write and its effects, then renders, arms the timer and journals; storage runs on its own serialized chain, each op bounded to 1.5 s; IndexedDB open bounded to 3 s (then memory); the boot read bounded to 3 s (then a fresh session; defect 4 below); after "Apagar agora" the new session never reads storage; `tests/runtime/engine-loop.test.ts` (wedged writes: three cards render immediately; a read that never settles: first card at 3 s; a failed read: fresh session; control: a slow read still resumes a latched P0; renderer crash: the P0 is still persisted; slow store: the erased session never resumes) |

### New defects found during remediation (not in the first two passes)

1. **A helper was offered a message saying *they* are unwell (L10, UNSAFE for trust).** Found by the exhaustive L10
   assertion. `company=with_someone` is set for helpers by INVAL-003 but expires after 900 s, and `Q_COMPANY` is self-only,
   so it is never re-asked. Reproduced in a real session: helper · "Responde normal" · "Estranha ou ofegante" · "Calma" ·
   "Tranquilo" · +16 min → `CARD_CONTACT_WHATSAPP` with `wa.me/?text=Oi, não tô muito bem e preciso de alguém comigo…`.
   Fixed in data: `stay_close` when `company=with_someone ∨ actor=helper`; `message_whatsapp`/`message_sms` require
   `actor=self`. Scenario `helper-company-expiry`.
2. **Helpers addressed as the patient (L10).** `CARD_GROUNDING_FEET`, `CARD_GROUNDING_SENSES`, `CARD_RELOCATE` had no helper
   copy; `CARD_STEADY_TIPS` resolved the substance key before the actor key; `CARD_Q_SUBSTANCE` asked the helper "Usou
   alguma coisa?". Helper variants added (draft, same clinical gate); `variantKeysFor` tries `<substance>.<actor>` first;
   `tests/invariants/perspective.ts` is asserted in the fast suite and in exhaustive Tier A/B (mutation-checked: removing one
   helper variant fails it).
3. **Production: no dialable 192 inside three flows.** `style.css:413` hides the home 192/188 strip while a sheet is open and
   `showCrisisBar` rendered the in-sheet bar only for falar/panico/cssrs/crisis nodes/risk ≥ MODERATE. Chromium with every
   third-party host blocked: `torto` (the substance flow), `realidade`, `trava` → **0 clickable tel:192**. Fixed: the crisis
   bar renders in every flow. `e2e:legacy` fails on the old script and passes on the new one. The same run shows the legacy
   page works with the CDN entirely down (no page errors).
4. **The first R1 fix left the boot read unbounded.** Found by re-reading this pass, not by a guard. `EngineLoop.start()`
   awaited `store.loadState()` with no budget, so an IndexedDB read that never settles reproduced R1 at boot: no engine card,
   and the service worker (registered after the first card) never installed. The static shell stayed usable. Fixed: the read
   is bounded to 3 s, and a read that times out or fails starts a fresh session. Two tests fail on the unbounded read
   (mutation-checked); a control proves a slow read inside the budget still resumes a latched P0.

### Corrections to this audit

- **§20** "the helper is never asked how they feel … verified copy" — *partially false*: `Q_HOW_NOW` was correct, but the
  grounding, relocate, tips and substance cards addressed the helper as the patient, and the self-crisis WhatsApp template
  was reachable by helpers (items 1–2 above, now fixed).
- **§3 / Top-10 #5 `core.js` "UNKNOWN / UNSAFE"** → evidence (fetched 2026-09-25, 87 KB): an ecosystem loader that injects
  ~20 scripts from `cdn.apollo.rio.br` (jQuery, GSAP + 7 plugins, Lenis, popper, morphism, translate, icon, apollo-suporte,
  script.js, tooltip) plus Google Fonts and `assets.apollo.rio.br`. Its storage keys are theme/dark-mode/fullscreen only; no
  script reads `sos_flow_progress`/`sos_risk`. `tracker.v2` (POSTs analytics to `<origin>/wp-json/apollo/v1/track/batch`) is
  **not** in the current load list, but its gate `isApolloFamilyHost()` admits `sos.apollo.rio.br`, so adding it to the list
  upstream would ship analytics on the crisis page with no change in this repo. `apollo-suporte.js` posts name/e-mail/message
  to a Google Form and `apollo.rio.br/wp-json/apollo/v1/report`, but has no `[data-apollo-suporte]` trigger on SOS pages.
  **Verdict: no exfiltration of health state in the current version; supply-chain risk remains** (unpinned, no SRI, no CSP,
  same-origin access to the persisted risk state).

### Still open

| Item | Owner / phase |
|---|---|
| Remove `core.js` from `/app` and the gateway, or pin it with SRI behind a CSP (000.5 item 4 / C2) | owner decision |
| "Você não está em perigo real." (`data.json` panico `m1`) — categorical reassurance before any red-flag check | owner + clinician |
| C-SSRS attribution/licensing; repository LICENSE | owner |
| Continuity consent card, recovery-key UI, vault server incl. per-episode delete (now in VAULT-PROTOCOL) | phases 3/7/9 |
| Belief engine, need map, human-state v2, packs, programs, care router | phases 10–24 |
| Legacy progress older than 12 h is erased on the next visit (a static page has no background job) | residual, accepted |
| `CARD_RELOCATE` action labels ("Cheguei") are first-person for helpers — labels have no actor variants | copy model |
| Engine bundle 107 KB (continuity plane not lazy-loaded) | v0.2 §13b |
| Persisted `SessionState.v` is never read, so a state saved by an older bundle is resumed as-is after a service-worker update. Not reproduced. If processing such a state throws, the engine fails to shell (static help, tel:192) on every load until `storage.retentionHours` (12 h) passes | runtime: state versioning |

### Scorecard deltas (engine / production)

| Area | Before | After |
|---|---|---|
| Offline Independence | PARTIAL / PARTIAL | **VERIFIED** (render-first, bounded storage, tests) / PARTIAL (works with the CDN down — verified — but still loads it) |
| Privacy | VERIFIED / FAIL | VERIFIED / **PARTIAL** (risk state bounded to 12 h; `core.js` evidenced; supply-chain risk open) |
| Remote Continuity | PARTIAL / FAIL | PARTIAL (purge + erase real; consent/server absent) / FAIL |
| Rescue | PARTIAL / PARTIAL | PARTIAL (perspective fixed; `ACTOR_CHANGED` missing) / PARTIAL |
| Clinical Safety | FAIL / FAIL | **PARTIAL** (INV-027 proven; clinical review pending) / **PARTIAL** (192 in every flow; copy flag open) |
| Testing | VERIFIED / FAIL | VERIFIED / **PARTIAL** (`e2e:legacy` guards the production page) |

Executive verdict after remediation: production **STRUCTURALLY MISALIGNED** (it still serves linear flows — by the
release-gate rule, not by accident); engine **PARTIALLY COMPLIANT** with **no open UNSAFE finding**.

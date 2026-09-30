# Clinical & editorial review — release gate

`npm run registry:lint -- --release` fails while any of the following is true:

1. A card marked `"clinical": true` in `registry/locales/pt-BR.json` has `review` ≠ `"clinical"`.
2. Any hard rule has `review: "proposed"` (HR-006 fainted, HR-007 self-harm, HR-008 silence-after-risk).
3. `meta.status` in `registry.json` ≠ `"approved"`.

## What the reviewer signs
| Scope | Items | Question to answer |
|---|---|---|
| Hard rules | HR-001…HR-009 | Is each condition a sufficient reason to show "Ligue 192" first? Is the order right? |
| P0 copy | CARD_P0_CALL, _CALL_CRISIS, _WAITING, _BYSTANDER, _HANDOVER (all reason × actor variants) | Is the first-aid guidance correct, safe for a lay person, ≤ 200 chars? |
| Band rules | BR-P1-05 (downer + alone → P1) | Clinically justified? |
| Harm-reduction tips | CARD_STEADY_TIPS (stim / downer / psychedelic) | Accurate, non-judgmental, no dosing advice? |
| Triage labels | Q_RED_FLAGS, Q_RESPONDS, Q_BREATHING | Does each label mean exactly what its `set` records? (label ↔ data parity) |
| Text triggers | TT-001…TT-007 | Missing common regional phrasings? False positives? |
| Techniques (audit 010) | CARD_GROUNDING_COLD (cold water on face/neck/wrists: diving reflex), _SIGH (double sigh), _HUM (humming), _WALL (push a wall) | Safe for a lay person in panic? Cold water is gated by normal breathing + responsive: are more contraindications needed (heart disease, stimulant intoxication, eating disorders)? |
| Rhythm (audit 010) | L21–L24, `minIntervalSec`, `questionsBetweenHelps`, PRESENCE note | Is one question between helps, and "how are you" at most every 10 min, clinically adequate? |
| ~~Substances (audit 011)~~ | ~~Q_SUBSTANCE, Q_WHICH_STIM/_DOWNER/_PSY, Q_SEX~~ | Retired in audit 014 (L30): the app no longer asks what was used. |
| Discreet discovery (audit 014) | Q_FEEL («Como tá o corpo agora?»), Q_RACE_KIND, Q_RACE_LENGTH, Q_HEAVY_KIND, Q_STRANGE_KIND, Q_MIXED_KIND, Q_ALCOHOL («E bebida, rolou hoje?»), Q_MEDS («Tomou algum remédio hoje?»), Q_URGE («Tá batendo vontade de mais?»), Q_BODY | Do the effect descriptions separate the families of studies/004 well enough to pick the right care? Is «Tava acelerado e agora bateu um sono estranho» (wired_sleepy) rightly treated as reopening breathing and chest? Is asking about an urge for more acceptable and useful? |
| Combinations (audits 011, 014) | risk `mixing` (now keyed on the described pattern, bebida and remédio), BR-P1-07 (≥3 → P1), BR-P2-03 (≥2 → P2), 8 CARD_CARE_MIX_* warnings (new: sono depois de acelerar, acelerado com o corpo longe) | Right pairs and levels? Anything missing (e.g. MDMA + SSRIs, alcohol + opioid pills)? Is "never P0 by itself" acceptable? |
| Care tips (audits 011, 014) | CARD_CARE_* cards (soro fisiológico no nariz / gargarejo, water in sips "não litros", food, teeth, cool shower, side position, fresh air for quick dizziness, one erection pill only, «A vontade é uma onda», «Deixa o resto longe», pattern-specific variants) and `can_swallow` / `awake` gates | Accurate and non-judgmental? Saline is described as rinsing and soothing, never "neutralizing" (audit 011 F1). Are the gates enough? |
| Re-check timing (audit 012) | Good answers valid longer: breathing normal 20 min, no chest pain 30 min, responsive 30 min; re-checks only after a tap (L28) | Is this safe, in particular for a helper watching a friend on depressants? |
| Pace and orb (audit 011) | L25 (slow = ≥ 20 s per answer → no questions between helps), L27 orb in 4 · 1 · 6 behind every non-P0 card | Is the orb's pattern appropriate for everyone who breathes normally? Is 20 s a sensible "slow"? |

## How to review: the beta lab
Open `/app/lab/revisao.html` (see `docs/BETA-LAB.md`). It lists every item above, read from the registry and the locale,
plus every triage question and every strategy card (grounding contraindications included). Give a verdict per item,
download the file, and send it to the team. `npm run review:summary -- <file>` turns it into the row below once every
required item is approved on the current registry hash.

## Record of approvals
| Date | Reviewer (name, registration) | Scope | Registry hash | Notes |
|---|---|---|---|---|
| — | — | — | — | pending |

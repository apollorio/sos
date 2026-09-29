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

## How to review: the beta lab
Open `/app/lab/revisao.html` (see `docs/BETA-LAB.md`). It lists every item above, read from the registry and the locale,
plus every triage question and every strategy card (grounding contraindications included). Give a verdict per item,
download the file, and send it to the team. `npm run review:summary -- <file>` turns it into the row below once every
required item is approved on the current registry hash.

## Record of approvals
| Date | Reviewer (name, registration) | Scope | Registry hash | Notes |
|---|---|---|---|---|
| — | — | — | — | pending |

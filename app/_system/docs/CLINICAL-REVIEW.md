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

## Record of approvals
| Date | Reviewer (name, registration) | Scope | Registry hash | Notes |
|---|---|---|---|---|
| — | — | — | — | pending |

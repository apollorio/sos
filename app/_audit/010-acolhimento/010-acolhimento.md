# 010 · Acolhimento: help first, no "how are you?" loop, a menu always

**Date:** 2026-09-29 · **Branch:** `claude/connect-i913l0` · **Trigger:** owner feedback after using the beta simulator.

## The feedback (owner, paraphrased)

The owner tried the new engine while not in crisis and still felt suffocated. The repeated "how are you feeling right
now?" made them feel pressured to say they were better when they were not. The questions kept coming without pauses for
real help. The simple one-flow page live at sos.apollo.rio.br works better: there are always clickable options, always
relaxation techniques, and concrete things like splashing cold water on the face and neck.

The feedback is correct, and it was measurable.

## What the engine did (before this phase)

Replayed through the real core with a person tapping at a human pace:

| Situation | What happened |
|---|---|
| Self, panic, with a friend | 5 questions before the first help. After every exercise, "Quanto de ansiedade agora?" again: 3 times in 6 minutes. |
| Self, panic, **alone** | The only help was "Chama alguém de confiança". No calming technique at all. Every 65 s without a tap, "Tudo bem por aí?" **replaced the help card**. After "Melhor", "Quanto de ansiedade agora?" every minute. |
| Techniques | 3 (breathing, feet on the floor, five senses), rotating. Each card: "Terminei" or "Outra coisa". No menu, no cold water. |

### Root causes

1. **"Finished an exercise" erased the anxiety answer on purpose** (`SIGNALS_EXPIRED anxiety` on every "Fiz"), so the
   engine re-asked it after every exercise. The blueprint called this monitoring; for the person it is an interrogation.
2. **Silence was answered with a question.** P1-010/P2-010 put "Tudo bem por aí?" on screen after 60 s (P1) or 180 s (P2)
   without a tap, replacing whatever help was there. People doing a one-minute exercise do not tap.
3. **Nothing limited how often a question returns.** `maxAsks` was 12 for anxiety and 20 for "how are you", and any
   expiry made them askable again at once.
4. **Up to 5 questions before the first help** (budget 3 in P2).
5. **Alone meant "contact" first**, and contact first meant a person in panic got no calming technique.
6. **No way to choose.** The engine decided everything; the person could not pick a technique or say how they felt
   unless asked.

### What the live one-flow page does right

`app/legacy.html` + `data.json`: 1–2 taps to the first technique; the first technique is concrete and physical
("Água gelada no rosto, nuca ou punhos"); 96 techniques across flows; a check-in ("Como você está em relação a alguns
minutos atrás?") in only 4 of 30 choice points, and **both answers lead to more support**; reassurance lines between
techniques ("Continuo aqui com você", "O pânico tem pico.. e depois baixa").

## What changed

Four laws, appended to the registry (L21–L24), each enforced by data, code and tests:

| Law | Rule | Where it lives |
|---|---|---|
| **L21** | Help comes before questions. After a short triage (≤ 2 questions after the safety ones), at most one question stands between two helps. | `engagement.*.questionBudget` = 2, `questionsBetweenHelps` = 1; new policy **P1-015**: for a person helping themselves, the first help is a calming technique, even alone. |
| **L22** | Never interrupt help to ask how the person is. | P1-010/P2-010 no longer fire on silence (only when returning to the app). Silence on a help card adds the quiet note **"Tô aqui com você. Sem pressa."** A timer never replaces a help card; only a tap, P0, a lost contraindication, or a safety re-check while someone is being watched can. Lint rule INV-028, property test. |
| **L23** | A way out and a menu, always. | A menu of up to 13 chips under every non-emergency card (besides the "Chegou alguém?" chip), in three groups: *Outras formas de se acalmar* (8 techniques), *Falar com alguém* (message, CVV 188, stay close), *Se quiser dizer como está* (Tá um pouco melhor / Tá piorando). A pick comes next unless P0 or a critical safety question comes first. The menu is empty in P0 and never offers a contraindicated technique or the wrong perspective (INV-029). |
| **L24** | The same question is not repeated within its interval; "prefiro só continuar" is always an answer. | `minIntervalSec` 600 on "Quanto de ansiedade?" and "Como você está agora?" (max 4 / 3 asks); anxiety lasts 15 min; "Fiz" no longer erases it. |

**New techniques** (copy adapted from the live page; draft until clinical review): *Água gelada no rosto* (first
technique; "Não tenho água aqui" blocks it for an hour), *Suspiro duplo*, *Hmmm de boca fechada*, *Empurra a parede*.
With breathing, feet on the floor and five senses: 7 techniques, each with helper-addressed copy (L10).
Contraindications are data (INV-027, generalized to every requirement of every shown strategy): anything that changes
breathing **and cold water** need normal breathing and a responsive person.

**Copy:** "Tudo bem por aí?" → "Que bom que você voltou. Como você está agora? Se preferir, é só continuar." (only after
returning to the app), with "Prefiro só continuar". The P3 card no longer claims "Tá mais tranquilo." (it was shown to
people whose anxiety was simply unknown): "Tô aqui com você. Se quiser, escolha uma técnica abaixo…".

**Safety kept:** hard rules and P0 are untouched and still come first. A helper watching someone (or any medical risk)
still gets the breathing/responsiveness re-check on a timer. HR-008 (silence after medical risk → bystander mode) still
fires. The static 192 bar never leaves the screen.

## After

| Situation | Now |
|---|---|
| Self, panic (with or alone) | 4 taps to the first help, which is **cold water**. Then one question at most between helps. "Quanto de ansiedade?" at most twice in 15 minutes; "Como você está agora?" zero times. |
| Alone | Cold water first, then "Tem alguém de confiança aí com você?", then the WhatsApp card; "Não tenho ninguém" → CVV 188. |
| Silence on a help card | The card stays, with "Tô aqui com você. Sem pressa." |
| Any moment | The person can pick any safe technique, a person to reach, or say "Tá piorando" / "Tá um pouco melhor". |

## Findings

| # | Finding | Status |
|---|---|---|
| F1 | The six root causes above. | Fixed (this phase). |
| F2 | Latent bug found by the property test: a question shown for the last time its `maxAsks` allowed disappeared on the next timer step. | Fixed in `voi.ts` (the question on screen is never "re-asked"). |
| F3 | Cold water on the face triggers the diving reflex (slower heart rate). With abnormal breathing it is gated off; whether it needs more contraindications (heart disease, stimulant intoxication, eating disorders are commonly cited for cold-water TIPP skills) is a **clinical decision**. | Open, in the review sheet (`/app/lab/revisao.html`, item `CARD_GROUNDING_COLD`, flagged clinical). |
| F4 | The first help still needs 4 taps (actor, red flags, clarity, anxiety); the live page needs 1–2. The two safety questions cannot go; whether "clarity" can wait until after the first technique is a clinical/product decision. | Open. |
| F5 | The live page's reassurance lines between techniques ("O pânico tem pico.. e depois baixa") have no equivalent yet besides the PRESENCE and ACK notes. | Open (copy, next phase). |

## Verification

| Check | Result |
|---|---|
| `npm run registry:check` · `npm run typecheck` | 0 errors · clean |
| `npm test` | 187/187 in 19 files (new: `tests/invariants/acolhimento.test.ts`; 4 new golden scenarios; 10 rewritten for the new rhythm; L22 property with menu picks, also run at 1,500 sequences ×3) |
| `npm run test:exhaustive` | Tier A 3,151,872 states · Tier B 387,072 · Tier C 2,304 · 510 P0 combinations · coverage 51/51 (42 from single states + 9 through sequences, each pinned to a named golden scenario and checked) |
| `npm run build:check` | shell, simulator and lab up to date |
| `npm run e2e` | 34/34 in Chromium (new: first help is cold water after 4 taps with the menu below; a menu pick opens that technique; no menu in P0) |
| `npm run e2e:legacy` | 9/9 |

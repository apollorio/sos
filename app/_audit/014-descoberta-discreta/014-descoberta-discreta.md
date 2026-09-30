# 014 · Descoberta discreta: the body first, never «o que você usou?», and a hidden lab panel

**Date:** 2026-09-30 · **Branch:** `claude/connect-i913l0` · **Trigger:** owner, pasting the «O que a pessoa usou?» card:
"initially we need to map in a discreet way, not asking straight to the point = WHAT U USED?! … gross, rude and not
supportive to who's probably in crisis. … the most delicate, same side, never from above, never giving a lecture, but a
supportive extra friend who can get what we used and slow down the high." Plus: "Ctrl+H ⇒ opens a lightbox with the
simulator and the backlog of registers", and the app on the owner's disk (`D:\…\sos\app\index.html`) ready for the beta lab.

Sources read in full: `_knowledge/studies/004/akinator-effects-flow.md`, `brainstorm.md`, `suggested_flows.md`
(the attached files; `suggested_flows.md` is now committed next to the other two).

## New law and invariant

| | |
|---|---|
| **L30** | Discovery is discreet and from the same side. The app never asks «o que você usou?» and never names a substance to the person. It asks how the body feels, then one gentle detail at a time, and follows the care that body needs. The inferred pattern is a hypothesis for care, visible only to the lab operator, never a fact (L15, L16; studies/004). |
| **L26** (rewritten) | What was used only adds care, learned the way a friend would (L30). Combinations still raise the band and bring their warning at once, never P0 by themselves; no dose, no second substance, no antidote. |
| **INV-034** | No copy the person can see names a substance or asks what was used. Linted over every card, chip, notice **and** every summary phrase (the Crisis Passport the person shares), and property-tested over every step of every persona and golden story. |

## The conversation now (VOI-driven; a help always sits between two questions, L21)

| Question | pt-BR (self) | Answers → what the engine keeps (operator only) |
|---|---|---|
| `Q_FEEL` | «Como tá o corpo agora?» · «Do seu jeito, sem julgamento. É só pra eu cuidar do jeito certo.» | Acelerado, ligado, coração a mil · Pesado, lento, com sono · O mundo tá diferente, estranho · Duas coisas ao mesmo tempo · Nada disso, é mais a cabeça · Não sei dizer → body class |
| `Q_RACE_KIND` | «E essa energia puxa pra quê?» | Gente perto, música, abraço (`love_energy`) · Falar, fazer coisa, não parar (→ `Q_RACE_LENGTH`) · Acelerado, mas o corpo meio longe (`wired_unplugged`) |
| `Q_RACE_LENGTH` | «Parece mais uma onda ou um motor?» | Onda que sobe e baixa rápido (`short_wired`) · Motor que não desliga, sem sono (`long_engine`) · Pancada forte e curtinha, depois vazio (`spike_crash`) |
| `Q_HEAVY_KIND` | «Esse peso tá mais como?» | Solto, depois foi ficando torto (`loose_clumsy`) · Tava bem e do nada despencou (`warm_cliff`) · Sono pesado, cabeça caindo (`heavy_nod`) · O corpo parece desligado, longe (`unplugged`) |
| `Q_STRANGE_KIND` | «O que tá mais diferente?» | As coisas parecem vivas (`living_world`) · Padrões, tempo quebrado (`long_patterns`) · Leve: riso, fome (`soft_hungry`) · O corpo, mais do que o que se vê (`unplugged`) · Tontura e calor que vêm e passam rápido (`buzz_brief`) |
| `Q_MIXED_KIND` | «Quais duas coisas estão juntas?» | Acelerado e o corpo mole, longe · **Tava acelerado e agora bateu um sono estranho** (`wired_sleepy`: re-opens breathing and chest, i.e. the safety questions come back) · Acelerado e o mundo diferente |
| `Q_ALCOHOL` | «E bebida, rolou hoje?» · «Sem problema nenhum. Só muda o jeito de cuidar.» | asked only if bebida would change the next help |
| `Q_MEDS` | «Tomou algum remédio hoje?» · «Qualquer um conta, até de farmácia.» | Pra ereção · Calmante ou pra dormir · Outro remédio · Nenhum · Não lembro |
| `Q_URGE` | «Tá batendo vontade de mais?» · «Aquela vontade de voltar pro começo. Normal. Só me fala, sem julgamento.» | → «A vontade é uma onda.» (`care.urge_wave`) |
| `Q_BODY` | «Tem algo incomodando no corpo?» | nariz · garganta · calor · enjoo (unchanged) |

Retired, IDs kept in `conventions.retiredIds`: `Q_SUBSTANCE`, `Q_WHICH_STIM`, `Q_WHICH_DOWNER`, `Q_WHICH_PSY`, `Q_SEX`
(+ their cards), signals `substance` and `sexEnhancer` (documented as retired), `care.poppers_care`.

Warnings are keyed on the described pattern, bebida and remédio. New: «Sono depois de acelerar pede atenção.»
(`rush_then_sleep`) and «Acelerado com o corpo longe..» (`wired_unplugged`). Titles speak like a friend: «Bebida com essa
energia esquenta.», «Dois pesos juntos somam.», «Com remédio de ereção, isso derruba a pressão.». Care copy has pattern
variants (e.g. `put_away.love_energy`: «Mais uma não traz o começo de volta.. só esquenta e cansa. Deixa longe da vista.
A onda baixa sozinha.»). A helper now hears helper lines after a help (`DONE_H1–H3`: «Você tá fazendo o certo ficando junto.»).

## Findings (found while building this; all fixed here)

| # | Finding | Fix |
|---|---|---|
| F1 | «O que você usou?» / «O que a pessoa usou?» asked a person in crisis to confess, before any trust. | Retired; body-first flow above; L30 + INV-034. |
| F2 | **The most dangerous described mix could never be discovered.** `Q_MEDS` was gated on «bebida» having been asked, but VOI (correctly) skips «E bebida?» when it cannot change anything, e.g. after «Tontura e calor que vêm e passam rápido». So quick dizziness + erection medicine (a dangerous drop in blood pressure, P1) was unreachable. Found by the golden story `tontura-com-remedio-de-erecao`. | `Q_MEDS` opens after the body pattern too (priority keeps bebida first when it matters). The story now reaches P1 + the warning in 2 taps after the pattern. |
| F3 | Substance names had leaked beyond the question: «longe de poppers» (`CARD_CARE_PILL`), «Poppers: dois cuidados.», «Pra ereção (tipo azulzinho)», and every summary phrase the person shares («aviso: bala com álcool», «disse ter usado pó (cocaína)»…), plus the lab mission stories. The first lint only covered cards, chips and notices. | All rewritten by effects («nada de cheirinho que dá tontura junto», «aviso: energia com bebida esquenta», «registro antigo: aceleração curta»). Lint extended to `signalPhrases` and `strategyPhrases` and to poppers/azulzinho/viagra/cialis; a lab test keeps mission stories name-free. |
| F4 | «Bora esperar 10 minutos juntos» on the urge card: a timed hold in words, which the owner had asked to remove in 013. | «Bora deixar passar juntos». New test: no card title or body contains a number of minutes. |
| F5 | `sync-local.ps1` could never report OK: its "stale" markers (`CARD_STEADY_CHECK`, `check_later`…) are listed in `retiredIds`, which the current build contains. Its messages also used non-ASCII text, which Windows PowerShell 5.1 misreads in a BOM-less file. | Checks the ASCII marker `Q_FEEL` (present only in builds with this flow) and `app/local.html`; ASCII-only file. |
| F6 | A helper heard lines written for the person in crisis after each help. | `DONE_H1–H3` for helpers; property test over every step. |
| F7 | «Como está o lugar?» and «Tem alguém com você?» came back too often. | Calm answers stay valid longer (`ttlByValue`: quiet 60 min, moderate 30 min, with someone 60 min). |

~~Audit 013 said the app learns "what was used (one tap: «Bala + álcool»)".~~ Superseded here: nothing asks what was used.

## Ctrl+H lab panel and the app on the owner's disk

- `src/ui/lab-panel.ts`: **Ctrl+H** in the app opens a `<dialog>` with **Registro** (this session's log: time, band,
  input, rule → card, notice; newest first, max 300), **Pista** (body feel, most compatible studies/004 family,
  bebida, remédio, vontade, what hurts, mixing level, warnings and care given, next question, pace) and **Simulador**
  (the lab simulator in a frame). Memory only; nothing stored or sent; no button, so nobody lands there by accident.
  Operator labels name families ("família C, MDMA-like") on purpose: L30 lets the operator see the hypothesis, never the person.
- `app/local.html` (stamped by `npm run build`): the same shell with a classic `defer` bundle and no SRI, because Chromium
  blocks module scripts and SRI on `file://`. The owner can double-click it in `D:\dev\_dev web\systems\sos\app\`.
  `app/index.html` is unchanged for the preview URL (module + SRI + service worker).
- The simulator's Pista table and the lab panel share one pure function (`src/ui/pista.ts`).

## Verification

| Check | Result |
|---|---|
| `npm run registry:check` · `npm run typecheck` | 0 errors (56 draft-copy warnings, expected until clinical sign-off) · clean |
| `npm test` | 214/214 (new: 6 L30 tests, 9 by-effect combinations, helper lines, mission names, no minutes in copy, local.html shell) |
| Golden stories | `pista-energia-bebida-remedio` (warnings for bebida and remédio, urge wave, put away; P2) · `pista-despencou-bebida-helper` (side position → P1 «Dois pesos juntos somam.» → stay close) · `tontura-com-remedio-de-erecao` (fresh air → «Tomou algum remédio hoje?» → P1 warning) |
| `npm run test:exhaustive` | Tier A 3,151,872 (11,280,384 monotonicity checks) · Tier B 387,072 · **Tier D 1,363,392** (body feel × pattern × bebida × remédio × vontade × care loop × pace; never P0 by a combination, nothing by mouth when unsafe, no shower when heavy) · Tier C 2,304 · coverage **81/81** (68 from single states + 13 pinned scenarios; `care.urge_wave` pinned to `pista-energia-bebida-remedio`, `care.put_away` now reachable from a single state) |
| `npm run build:check` · `npm run e2e` · `npm run e2e:legacy` | up to date · shell + lab green (new: body-first walk, never «o que você usou», Ctrl+H log and Pista, `local.html` boots from `file://`) · 9/9 |

## Open for the owner and the clinicians

- Every new question and warning is **draft** (`docs/CLINICAL-REVIEW.md` rows updated). In particular: whether the
  effect descriptions separate the families well enough, whether `wired_sleepy` should re-open the safety questions
  (it does), and whether asking about an urge for more is acceptable.
- The inferred pattern never reaches the person, but it does reach the operator's Pista. If the owner prefers the
  operator view to stay family-letter only (no "-like" names), that is one table in `src/ui/pista.ts`.

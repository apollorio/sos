# 012 · Sem pressa: only the person moves the screen, one tap answers two things, the v1 voice

**Date:** 2026-09-29 · **Branch:** `claude/connect-i913l0` · **Trigger:** owner field test of audit 011 (not in crisis, and it still caused stress).

## The report (owner, paraphrased)

> Eu → Respiro bem → Consigo → Bastante → Tô sozinho → WhatsApp → the screen JUMPED to «Você consegue pensar e
> responder normalmente?» and then "time out". Remove the timer from answers: people can think about what to answer.
> Never «Me chama em 10 min» and never «Tá mais tranquilo. Umas dicas curtas». The simple one-way v1 app is better:
> till now the new one did not know what I used or whether I mixed it with alcohol. Put a follow-up table in the
> Simulador: what was used, the extras, and alcohol. Make questions smarter: one question that gets two answers.
> Use the same flows and tips as v1.

The report is correct. Reproduced exactly (`tests/scenarios` `no-timer-jumps`):

| Cause | Mechanism |
|---|---|
| **Timers replaced cards.** | After «Abrir WhatsApp» a 3-min reply check fell due and **replaced the question on screen**. An answer ageing out (clarity 10 min, red flags 15 min) did the same, and a "watched" safety re-check could interrupt on a timer. The person's tap then hit a card that no longer existed: «Essa tela já mudou» = the "time out". |
| **A band change made a new card.** | The same card in another band got a new instance id, so a tap in flight became stale. |
| **Too many re-checks.** | Good answers («respiro bem», «sem dor no peito», «consigo») expired in 10–15 min and came back as questions, twice in a row. |
| **The pace rule took thinking for struggling.** | 20 s per answer counted as "slow" and switched discovery off: the app never learned what was used. |
| **Discovery was slow.** | Body description → which one → alcohol → sex = 4 questions, one between each two helps. |
| **Old tips card.** | `steady_check.tips` said «Tá mais tranquilo» to people who had never said so, and offered «Me chama em 10 min». |

## What changed

### L28 · Only the person moves the screen

On any step without human input (timer, answer ageing out, follow-up falling due, returning to the app) the card on
screen **stays, question or help, same instance**. Re-checks and follow-ups come with the next tap. The single
exception is an emergency (P0, e.g. HR-008 silence after medical risk). While a question waits, a quiet line says
«Sem pressa. Pode pensar com calma.. eu espero.»; a re-asked question says «Só conferindo de novo, rapidinho. Faz parte
do cuidado.» (INV-033: property test from every state of every golden scenario at +30 s, +10 min, +30 min.)

### One tap, two answers

«O que você usou?» (direct, not body-first) → «Bala, MD ou pó» · «G, calmante ou remédio» · «Só álcool» ·
«Ácido, cogumelo, ket, erva ou lança» · «Nada». Then «Qual deles? Teve álcool junto?»:
«Só bala / MD» · «Bala + álcool» · «Só pó» · «Pó + álcool» (and «Só G» · «G + álcool» · «Só calmante ou remédio» ·
«Calmante + álcool»). Choosing «Só …» when «+ álcool» was on offer records "no alcohol", so that question is never
asked; «Só álcool» answers three things at once. Discovery of what was used and whether alcohol was on top now takes
**two taps**, and the combination warning comes on the next card.

### Re-checks, pace, tips

- Good answers last longer (`ttlByValue`): breathing normal 20 min, no chest pain 30 min, responsive 30 min
  (abnormal/impaired values still expire fast). Clinical question in the review sheet.
- `pace.slowSec` 20 → **90**: thinking is not struggling.
- `steady_check.tips` retired; no card offers «Me chama em 10 min» (`check_later` removed; CARD_STEADY_CHECK now
  «Quero continuar aqui» / «Tô bem, encerrar»).

### The v1 voice and tasks

- After every «Fiz» on a technique or care tip, one line from the live v1 flows, rotating: «Isso. O corpo já está
  processando, mesmo que você não sinta ainda.» · «O que você sente agora é intenso.. não é permanente.» · «O efeito
  vai passando.. às vezes sobe, às vezes baixa. A direção é o fim.» · «Você fez o que deu. Isso já é muito. Tô aqui.» ·
  «Não precisa estar bem agora. Só o próximo minuto.»
- v1's first body task: «Um lugar firme pro corpo.. Senta ou deita em algo firme. Vira o celular com a tela pra baixo
  um segundo.. e volta quando quiser.» (`care.settle`).

### Simulador: the «Pista» follow-up table

A new pane under the decision: **Usou · Qual · Álcool junto · Pra transar · No corpo · Mistura (0–4) · Avisos
mostrados · Cuidados dados · Próxima pergunta da pista · Ritmo das respostas**, each in the words the person tapped.

## Findings

| # | Finding | Status |
|---|---|---|
| F1 | Timers replaced question and help cards (reply check, ageing answers, watched re-check): stale taps, "time out". | Fixed (L28, INV-033) |
| F2 | A band change re-created the same card (stale taps). | Fixed (`process-event.ts`) |
| F3 | Re-checks stacked (two in a row) and came every 10–15 min. | Fixed (longer validity of good answers; RECHECK line) |
| F4 | 20 s pace threshold switched discovery off for people who were just thinking. | Fixed (90 s) |
| F5 | «Tá mais tranquilo» + «Me chama em 10 min». | Fixed (tips retired, check_later removed) |
| F6 | Four questions to learn what was used and whether alcohol was on top. | Fixed (two taps, combined answers) |
| F7 | Runtime INV-027 flagged a kept card whose answers had only aged. | Fixed (kept cards were checked when shown; human input never keeps) |
| F8 | Longer validity of good answers means a helper's friend is re-checked less often (20 min for breathing). HR-008, the 192 bar and «Tá piorando» still watch. | Open, clinical |

## Verification

See the table appended after the final run.

| Check | Result |
|---|---|
| `npm run registry:check` · `npm run typecheck` | 0 errors · clean |
| `npm test` | 205/205 in 20 files (new: golden scenario `no-timer-jumps` = the owner's path; property L28/INV-033 from every state of every story at +30 s/+10 min/+30 min; no card offers a call-back later) |
| `npm run test:exhaustive` | Tier A 3,151,872 · Tier B 387,072 · Tier D 891,648 · Tier C 2,304 · coverage 83/83 (70 single states + 13 pinned scenarios) |
| `npm run build:check` | up to date (bundle 164 KB) |
| `npm run e2e` | 37/37 · review sheet 102 items (96 required) · 20 missions (new: «Pensando com calma») |
| `npm run e2e:legacy` | 9/9 |

Screenshot: `simulador-pista.png` (the «Pista» table after «Bala, MD ou pó» → «Bala + álcool»).

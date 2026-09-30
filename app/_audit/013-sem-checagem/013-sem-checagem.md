# 013 · Sem checagem: no "melhorou/piorou", no 10-minute hold, and a way to know the build

**Date:** 2026-09-30 · **Branch:** `claude/connect-i913l0` · **Trigger:** owner (not in crisis): "checking all the time seems
forcing the user to choose «ok I'm better now», aff, again and again checking if got any better?!"

## Removed (L29: the app never asks the person to grade how they are)

| What | Where it was |
|---|---|
| «Melhorou / Piorou» buttons | `CARD_HOLD` (the fallback card) |
| «Tá um pouco melhor / Tá piorando» | menu chips `CHIP_REPORT_BETTER/WORSE` |
| «Como você está agora?» | `Q_HOW_NOW` + policies P1/P2/P3-010 |
| «Passou um tempinho. Como está agora? Melhor / Igual / Pior» | `CARD_CONFIRM_CHECKIN` + commitment `CHECK_IN` (10 min) |
| «Me chama daqui a pouco» | `steady_check.check_later` + `CARD_STEADY_CHECK` |
| Text triggers that asked «how are you» when negated | now ask the safety question `Q_RED_FLAGS` |

The fallback card now says «Tô aqui com você. Sem pressa…» with «Continuar aqui» and «Tô bem, encerrar». The menu keeps
«Tô bem, quero encerrar» under a heading «Encerrar». IDs are listed in `conventions.retiredIds` and never reused.

What the app still learns, without grading: ~~what was used (one tap: «Bala + álcool»)~~ how the body feels, never what was used (superseded by audit 014, L30), what hurts, and what the person
taps. The **192 bar and the emergency triggers are untouched** (text «não consigo respirar», the red-flag question).
Removing «Tá piorando» removes one way to escalate by button; the person can still tap 192, type what is happening, or
end the session. Flagged for clinical review.

## «Why does my simulator's log not match?»

The log the owner pasted shows `P1-099 → HOLD`, `CARD_STEADY_TIPS`, `check_later`, `GROUNDING_BREATH`. None of these
exist any more (they were removed in audits 010–012). It was an **old `simulator.html` on the local disk**: the cloud
had been updated, the folder `D:\dev\_dev web\systems\sos` had not been synced. The cloud cannot write to `D:\`.

Fixes: (1) the simulator header now prints `versão do motor: registro <hash> · N habilidades …` so a stale copy is obvious;
(2) `sync-local.ps1` (repo root) fetches, hard-resets to the branch and **checks** that `simulator.html` is current.

## Verification

Appended after the final run.

| Check | Result |
|---|---|
| `npm run registry:check` · `npm run typecheck` | 0 errors · clean |
| `npm test` | 206/206 (new: L29 test over every card, chip, question, commitment and pt-BR label) |
| `npm run test:exhaustive` | Tier A 3,151,872 · Tier B 387,072 · Tier D 891,648 · Tier C 2,304 · coverage 79/79 |
| `npm run build:check` · `npm run e2e` · `npm run e2e:legacy` | up to date · 37/37 · 9/9 |
| 40-min replays of four personas | no «melhor/piorou», «como você está», «me chama», «10 min» anywhere (only the CVV card's "falar como você está" invitation) |

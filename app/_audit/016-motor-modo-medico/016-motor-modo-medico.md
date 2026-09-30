# 016 · Engine + calm shell as one app, live Modo Médico / Relatório

Date: 2026-09-30
Scope: `app/index.html`, `app/app.css`, `app/medico.html`, `app/relatorio.html`, `app/report.css`, `/_headers`,
`_system/src/{runtime,ui,report}`, `_system/src/core/handoff/summary.ts`, build/lab scripts, tests.

## What changed

- **One app.** `/app/` is again the stamped engine shell (L11 static 192, strict CSP, SRI, offline SW), now in the calm
  design: pure black, the engine's card as a sheet, the L27 orb with the three-colour light, one hue per menu area,
  red only for the emergency. The legacy-calm page is kept in `.superseeded/2026-09-30-calm-legacy-before-engine/`;
  ~~015: the menu lived on the legacy page~~ → it is now static HTML in the engine shell, driven by `src/ui/chrome.ts`.
- **Menu.** ~~015b branched tree~~ removed (owner). CardNav is the Apollo DS one, CSS path (no GSAP under the CSP),
  typography and tokens exactly as the DS page renders them. Footer controls: no surface; A+ · A− · % · volume (95 %) · play.
  «Chamar SAMU agora» sends the same shell action as the red bar (`call_192`, journaled as HANDOFF_OPENED).
- **Live journal.** The engine loop exposes `observe()`; `runtime/live-feed.ts` writes the current episode's journal into
  the acute store (`sos-apollo/kv` "journal": same 12 h retention and same wipe as the state, on the loop's own write
  chain so «Apagar agora» always runs after it) and broadcasts it on `BroadcastChannel("sos-apollo-live")`.
  A resumed episode keeps its journal.
- **Modo Médico** (`medico.html`) and **Relatório de Emergência** (`relatorio.html`), built on study 006: reported ≠
  derived ≠ unknown, «NÃO INFORMADO» never becomes «não», exposure only for the professional, P0 first, A4 print with
  text tags (not colour only), technical annex marked as non-clinical. All copy in `pt-BR.json → continuity.report`
  (INV-023 lexicon-checked by the lint). Lab mode: `medico.html?cenario=<golden scenario>` (`app/lab/cenarios.json`).
- **Privacy fix in the core summary.** The friend's Crisis Passport named substance-specific strategies
  («aviso: bala com álcool», «cuidados com azulzinho») even without EXPOSURE_CONTEXT. `revealsExposure()` now applies
  the same scope rule to those strategies (L26). Decisions unchanged.
- CSP: `media-src` allows only `https://assets.apollo.rio.br` (ambient piano, fetched after the first tap).

## Checks

- `npm run build` + `build:check` green; `tsc` clean; `npm test` 223/223 (+15 new in `tests/report`).
- e2e (Windows Chromium 151): shell 24/24, report 8/8 (new), legacy all pass. Lab e2e: the review-sheet radio `check()`
  times out after visiting the gateway — **pre-existing**: the committed HEAD fails identically on this browser build
  (the suite pins Linux chromium-1194). Not changed here; the hub tile count was updated to 8.
- Registry hash unchanged (3dd609a102323408): clinical review verdicts stay valid.
- Not run: `test:exhaustive` (no registry rule, band, hard rule, eligibility or ordering change).

## Open

- Fonts: the strict CSP forbids Google Fonts; the shell uses Bricolage / Space Grotesk only when installed. Self-hosting
  the OFL files in `app/assets/fonts/` needs the owner's OK to download them.
- The six legacy tiles have no engine equivalent (entry intents = blueprint phase 14, packs). The engine's own menu
  areas carry the colours meanwhile.

# 022 · Relatório / Modo Médico with real data · ambient sound · calm-app.css cleanup

Date: 2026-10-01 · Owner's four points: (1) audio not playing, (2) messy CSS, (3) PDF without the person's data,
(4) Relatório and Modo Médico show no data. Read with `_system/docs/BLUEPRINT.md` (L01, L15, L17, §15 privacy) and
audit 020 (option C: a narrow, honest bridge from the tiles page).

## Root causes

| # | Finding | Evidence |
|---|---------|----------|
| F1 | The ambient file does not exist on the asset host: `assets.apollo.rio.br/audio/clocks.flac` → `302 /erro/404/` (also `/audio/flac/…`, `.mp3`). Already noted in 017/018; not on disk either. | `curl -I`, MEDIA_ERR 4 in Chromium |
| F2 | `index.html` is the tiles page (no engine). The report pages read only the engine's IndexedDB `sos-apollo/kv`, which the tiles page never writes → «Aguardando o app» forever. | audit 020, `src/report/source.ts` |
| F3 | «Salvar PDF» is `window.print()` of `#doc`; with F2, `#doc` only held the waiting message. Print CSS itself was correct. | `report.css` `@media print` |
| F4 | `calm-app.css`: card 03 (the Von Restorff card) rendered `#030303` background with `rgb(15,15,15)` ink — invisible; menu links `flex-wrap: wrap` dropped the ↗ onto its own line; duplicated blocks (`.global-header`, `.breathe-label`, `.breathe-sub`, `.orb-rim`, `.opt-title`), no-op declarations, orb/audio rules appended at the end out of order. | computed styles at 375×812 |

## Changes

- **Sound** (`script.js`, `calm-nav.js`): the piano file is still tried first. When it cannot play (404, offline, file://),
  a soft pad is synthesized on the device (Web Audio: open A chord, low-pass, swells on the 12 s breath cycle). The
  context is unlocked inside the entry/button gesture so the switch is allowed on every browser. Same button, same
  volume slider (`SOS.onVolume`), status «Som ambiente tocando (gerado no aparelho)». No file, no network.
  **The real file still has to be uploaded to the asset host** to get the piano back.
- **Tiles journal** (`app/tiles-journal.js`, new; hooks in `script.js`): records only what the page observed (L01):
  app opened / reopened, tile opened, option tapped, task marked done, tel/WhatsApp/SMS link tapped, the flow's own
  attention level. Flow ids + the app's own copy; the page has no text input; phone numbers are never stored (only
  192/193/190/188, anything else → `outro`). localStorage `sos_tiles_journal`, 12 h like the engine, never sent.
- **Report** (`src/report/tiles.ts` new, `source.ts`, `boot.ts`): when there is no engine episode, the pages render the
  tiles episode with the same renderer. Rules kept: every engine signal stays «NÃO INFORMADO» (never «não»); a tap is
  «Tocou em ligar 192», never a call; «Bateu forte» (exposure) and screening only in Modo Médico (L26 parity);
  an option carrying a lexicon term (`samu.m3` «… overdose …») is cited, not quoted (INV-023); the flow's level is
  labelled derived and non-clinical. Live updates via the `storage` event + BroadcastChannel `sos-apollo-tiles`.
  Copy: 47 `continuity.report.tiles.*` keys in `locales/pt-BR.json` (draft, lexicon-checked by lint).
- **Bundles**: only the report bundles were rebuilt (`assets/report.<hash>.js` + `.classic.js`) and stamped into
  `medico.html` / `relatorio.html` (+ `sw.js` SHELL path). `npm run build` was not run: it would stamp `index.html` as
  the engine shell and replace the tiles page.
- **CSS** (`calm-app.css`, previous copy in `.superseeded/2026-10-01-before-css-cleanup/`): rewritten in 9 sections with
  the same values. A computed-style diff of all 170 elements (menu open, 375×812) changed only: card 03 colours (now a
  light card with dark ink), link `flex-wrap` (arrow stays with its label), and default-equivalent no-ops.
- `index.html`: `tiles-journal.js` added; cache-bust `calm-app.css?v=1.8.0`, `script.js`/`calm-nav.js?v=1.5.0`.

## Verified

- `npm run e2e:tiles` (new, Chromium 1234, third-party hosts blocked) 13/13: pad plays when the file fails · journal
  `start,flow,choice,task,tap,flow,choice` · no phone numbers · Relatório shows option/task/188 tap, leaves «Bateu forte»
  out · Modo Médico 3 sheets with exposure row, convulsão NÃO INFORMADO · a 192 tap reaches the open Relatório live ·
  PDFs written: `relatorio.pdf` (68 KB), `modo-medico.pdf` (184 KB) in this folder.
- Unit: `tests/report/tiles.test.ts` 8/8 + `report.test.ts` 15/15. `registry:check` 0 errors, `typecheck` clean.
- `npm test`: 224/232 — the 8 failures are the same pre-existing wiring failures as audit 020 (7 `build/stamp`,
  1 `lab`: they expect `index.html` to be the engine shell). None in `src/`.

## Not done / open

- ~~Piano file~~ still missing on `assets.apollo.rio.br` — upload needed (owner).
- file:// not re-verified for the tiles journal (localStorage is shared by file:// pages in Chromium; classic bundle stamped).
- Report pages: inline `<script>` blocked by their own CSP and `../../../theme/uni.css` 404 locally (pre-existing, audit 020).
- Mapping legacy choices to engine signals was not attempted (clinical decision, audit 020).

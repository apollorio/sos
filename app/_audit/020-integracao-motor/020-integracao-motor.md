# 020 · Is `app/index.html` integrated with `_system`? (4 parallel auditors, read-only)

Date: 2026-09-30 · Static wiring · runtime in Chromium (http + file://) · toolchain · legacy→engine data map.

## Verdict: **not integrated.**

`app/index.html` (working tree) is the legacy tiles page: `preloader.js`, core.js (CDN), `style.css`, `calm-app.css`,
`calm-orb.html`, `data.embed.js`, `script.js`, `calm-nav.js`. It loads no engine bundle, no `file-boot.js`, has no
`<main id="app">`, and never registers `sw.js`. In git HEAD it was the stamped engine shell.

| Area | Status | Evidence |
|---|---|---|
| Tiles app runs | ✅ | http + file://: 0 page errors, 6 tiles, «Pânico» flow walks (task cards, tel:188/192 in sheet) |
| Engine `src/` health | ✅ | `tsc` 0 errors · codegen/lint pass · 216 engine tests pass · all 4 bundles in `app/assets` = current sources |
| Engine running on index.html | ❌ | no bundle loaded; `script.js` never touches IndexedDB `sos-apollo` or `sos-apollo-live` |
| Modo Médico / Relatório with real data | ❌ | after a real walk: IndexedDB `sos-apollo/kv` empty → both pages «Aguardando o app» (http + file://) |
| Modo Médico lab scenarios | ✅ | `medico.html?cenario=…`: 3 sheets, 5 exposure rows, 2 warnings, picker |
| Menu → Modo Médico / Relatório | ✅ | new tab, `noopener noreferrer`, `window.opener === null` (burger is covered while a flow sheet is open) |
| Build pipeline | ❌ | `build.ts --check` / `build-lab --check` throw (index.html not the engine shell); 8 tests fail (7 stamp, 1 lab), all wiring, none in `src/` |
| `sw.js` | ⚠️ hand-edited | SHELL lists `medico.close.js`, `relatorio.a4.js`, VERSION not recomputed; the next build would drop them |
| `medico.html` / `relatorio.html` wiring | ⚠️ drifted | extra `<html>` attributes break the stamper regex; an inline `<script>` is blocked by the page's own CSP; CSP now allows `'unsafe-inline'` + CDNs |
| Privacy | ⚠️ | CDN `core.js` posts to `/wp-json/apollo/v1/track/batch` from index, medico and relatorio — analytics on health pages; needs an owner decision |
| Mirrors | ✅ | `blueprint.md` identical; `registry.json` identical in content (CRLF only) |
| Clutter | ⚠️ | `sos/app.zip` 56 MB (untracked), `_system/tests.zip` 27 MB (tracked), `index.v0 - Copia.html`, `index.v1 - Copia.html` |

## Bridging the tiles flows into Modo Médico

Feasible technically, weak clinically. Of the 18 engine signals the handoff reads, the tiles flows fill **4 explicitly
and only partially** (substanceClass=none, reportedTrend, selfHarm via C-SSRS c5, actor=helper via samu.a1). 8 would need
clinical interpretation, 5 are not fillable. Honest parts: phone/WhatsApp taps (HANDOFF_OPENED), flow start, done tasks.
Risks: red-flag labels would imply a P0 that never happened; C-SSRS past windows vs latched signals (L14); substance
inferred from symptoms (forbidden); legacy copy contains forbidden terms. CLAUDE.md freezes the legacy page (safety and
privacy fixes only), so this is an owner decision.

## Options (owner decision)

A. **Engine as the app** (`index.html` = stamped engine shell in the calm design, tiles page stays at `legacy.html`):
   everything green, Modo Médico fills live. Loses the 6 tiles on the home screen.
B. **Tiles as the app, engine at `motor.html`** (build + tests re-pointed): tiles unchanged, Modo Médico only has data
   for sessions run in `motor.html`.
C. **B + a narrow legacy bridge** (taps, flow start, done tasks, the 4 explicit signals, under its own storage key):
   Modo Médico shows a thin, honest "tiles episode" with mostly «não informado»; needs clinical review of any mapping.

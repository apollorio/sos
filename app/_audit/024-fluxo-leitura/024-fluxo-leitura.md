# 024 · Flow sheet: calmer reading order

Date: 2026-10-01 · The appended "section 10" from the previous attempt was removed first (owner: undo).

## Map (what renders the sheet)

| Order | Element | From |
|---|---|---|
| 1 | `.flow-indicator` (flow name) | `script.js` `paintNode` |
| 2 | `.crisis-bar` CVV 188 + SAMU 192 (sticky) | `renderCrisisBar` (via `wrapNodeContent`) |
| 3 | `.flow-header` icon + title | `renderFlowHeader` |
| 4 | `.node-text` (intro and question in one div) | `paintNode` |
| 5 | `.choice-list` / `.task-list` / `.action-list`, `.fast-lane` | `paintNode`, `renderTask`, `renderFastLane` |
| — | base styles | `style.css` 397–700, overrides `calm-app.css` §7 |

## Changes

- `script.js`: `splitQuestion()` — on choice nodes, a last paragraph ending in «?» renders as `.node-question`
  (27 of 30 choice nodes). Presentation only; flow copy untouched.
- `calm-app.css` §7: duplicate flow name visually hidden (kept as the dialog's accessible name); 188/192 one slim row
  of pills (CVV hint kept for screen readers); title as a quiet label; support text soft, question the one bright line,
  answers one borderless group; «preciso de algo agora» an outlined way out.
- Cache-bust: `calm-app.css?v=1.11.0`, `script.js?v=1.6.0`.

## Verified

- 375×812 «Bateu forte»: crisis row → label → intro → question → 4 answers → way out, no duplicate title.
- `npm run e2e:tiles` 13/13.

## Follow-up · quotes (`.exact-phrase`, `renderExactPhrase`)

- Text near-white (`rgba(255,255,255,.92)`), fill almost gone (`.015`), 3 px left line.
- Line colour: the flow accent is passed as `--quote` (`script.js`) and drawn more vivid
  (`oklch(from var(--quote) l+.08, c×1.8, h)`; plain accent as fallback). «Acelerou demais»: line `oklch(.80 .106 79)`.
- Cache-bust `calm-app.css?v=1.12.1`, `script.js?v=1.6.1`.

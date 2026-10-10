# 023 · Relatório always light · 188/192 strip glued to the bottom · computer layout · audio status

Date: 2026-10-01 · Scope: `relatorio.html`, `relatorio.light.js` (new), `calm-app.css`, `index.html` (cache-bust only).

## Findings

| # | Finding | Evidence |
|---|---------|----------|
| F1 | Relatório followed the shared Apollo theme preference: with `apollo-dark-mode=true` (shared by every `file://` page, and set by other Apollo pages) core.js added `dark-mode` / `data-theme="dark"` → dark page, white A4 sheets with light ink. An inline fix is impossible: the page's CSP blocks inline scripts. | Chromium, localStorage `apollo-dark-mode=true` |
| F2 | `nav.sos-strip` was in normal flow: on screens shorter than the content it scrolled away; the body's `safe-bottom` padding left a gap under it on notched phones. | 443×601: strip below the fold |
| F3 | Desktop: no layout of its own (a narrow phone column). core.js also injects `#apollo-sb-y` (custom scrollbar) whose CDN stylesheet 404s: unstyled, it became a 30 px invisible, clickable grid row that lifted the strip off the bottom. | 1280×800: body rows `112 658 0 30 0` |

## Changes

- `relatorio.light.js` (after core.js): removes `dark-mode` / forces `data-theme="light"` and `color-scheme: light` on
  `<html>` and `<body>`, now and whenever core.js re-applies it (MutationObserver). Never writes the preference, so the
  app stays dark and other Apollo pages keep theirs. `<meta name="color-scheme" content="light">`, one white theme-color.
- `.sos-strip`: `position: sticky; bottom: 0`, opaque page background, owns the safe area (`padding-bottom: s-2 + safe-bottom`;
  the body no longer pads the bottom). Never scrolls away, never covers the tiles.
- Computer = the phone turned sideways: the landscape layout now also applies at `landscape and min-width: 900px`
  (orb left, tiles right, strip at the foot); taller screens get more room (880 px column, 280 px orb, 112 px tiles).
- `#apollo-sb-y` / `#apollo-sb-x` hidden in the app (native scrolling).
- `.nav-audio-status`: centred, opacity .4.

## Verified (Chromium, localhost)

- Relatório with `apollo-dark-mode=true` and OS dark: `data-theme=light`, body `rgb(249,248,248)`, ink `rgba(10,10,10,.8)`; preference still `true`.
- Strip bottom = viewport bottom at 375×812 (812) and 1280×800 (800); at 443×601 it stays glued (545–601) while the tiles scroll under it.
- Desktop 1280×800: body rows `112 688 0`, two columns, no scroll.
- Audio status: `text-align: center`, opacity .4.
- `npm run e2e:tiles` 13/13.

## Open

- Modo Médico (`medico.html`) has the same theme behaviour as F1; not changed (not requested).

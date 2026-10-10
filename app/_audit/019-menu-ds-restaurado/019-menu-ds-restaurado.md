# 019 · DS menu on the restored tiles page + what is still open

Date: 2026-09-30
The owner restored `app/index.html` to the tiles page (legacy flows: `script.js` + `data.embed.js`, calm layer
`calm-app.css` / `calm-nav.js` / `calm-orb.html`). This phase only touched the menu of that page.
Backup before editing: `.superseeded/2026-09-30-before-ds-menu-restore/`.

## Done

- ~~015b branched tree~~ removed from `index.html`, `calm-app.css`, `calm-nav.js`.
- Menu CSS = the DS CardNav rules verbatim, with the DS tokens scoped to `.card-nav` (the tiles page keeps its own).
  Computed styles match the DS page (colours, sizes, radii, glass, burger); the fluid sizes differ by 0.05 px
  (same `clamp(…vi)` formula, different page width).
- Menu script = the DS `NavCards` (GSAP height + staggered cards via core.js, CSS fallback), plus the elapsed counter
  and a viewport cap. Footer controls (A+ · A− · %, volume, play) unchanged.
- «Relatório de Emergência» → `./relatorio.html`, «Modo Médico» → `./medico.html`: same folder, `target=_blank`,
  `rel="noopener noreferrer"` (no opener, no referrer), nothing in the URL. «Compartilhar» stays «em breve».
- Verified in Chromium over http and file://: 6 tiles, a tile opens its flow, menu opens (3 cards, GSAP), both pages
  open in a new tab with `window.opener === null`, no page errors.

## Still open (not broken by this phase — decisions needed)

1. **Modo Médico / Relatório show «Aguardando o app»** with this page: the tiles flows (`script.js`) do not write the
   engine journal these pages read. They only fill with data from the engine app. Bridging the tiles flows into the
   journal is new work.
2. **The engine app has no URL now.** `index.html` is the tiles page again; the engine shell is not published anywhere.
   `npm run build` / `build:check` stop ("module script tag not found") and 8 tests in `tests/build` + `tests/lab`
   fail, because the pipeline stamps `app/index.html` as the engine (CLAUDE.md layout). The check never writes, so it
   cannot overwrite the tiles page, but CI is red until the engine gets its own file (e.g. `app/motor.html`).
3. **Stale service worker (only where the engine version was opened over http, e.g. localhost):** `sw.js` precaches the
   engine `index.html`; that browser may keep showing the engine page instead of the tiles. Fix: DevTools → Application
   → Service workers → Unregister (or a self-removing `sw.js`). Production never had it.
4. External, pre-existing: `clocks.flac` is 404 on assets.apollo.rio.br; core.js theme CSS (`uni.theme.v2.1.css`) 404;
   live sos.apollo.rio.br root has 404s for `style.css` / `preloader.js` (see 018).
5. Nothing is committed; local `main` = `origin/main`.

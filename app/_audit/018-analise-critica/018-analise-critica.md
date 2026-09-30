# 018 · Critical analysis: "the app is not working anymore"

Date: 2026-09-30 · Evidence: real Chromium 151 runs (http + file://) and live HTTP checks.

| Question | Finding |
|---|---|
| Was anything pushed or uploaded? | **No.** Local `main` = `origin/main` (5703608), 0 commits ahead/behind. All work is uncommitted in the working tree. |
| Is the live site (sos.apollo.rio.br) built from GitHub? | **No.** HostGator, manually uploaded, different code (`/app/` = `app-danos.js`). Untouched by this work. |
| Live `/app/` | Serves 200; preloader intro ~45 s (one tap skips one line, not the intro). |
| Live `/` (root) | **Broken, pre-existing:** `style.css`, `preloader.js`, `_lib/TEXT-ROTATING/text-rotating.js` return the host's 404 page. |
| Local `app/index.html` | Since audit 016 it is the **engine** shell (owner request "tie engine + index + design"), not the v0 tiles page. Boots on http and file:// (017); first card «Quem precisa de ajuda?». This is why the v0 tiles are no longer there. |
| On GitHub `main`, what was `app/index.html`? | Already the engine shell since audit 009. The v0 tiles page lives at `app/legacy.html` (unchanged vs HEAD). The tiles version with the calm layer (014–015) was a local, uncommitted edit, backed up in `.superseeded/2026-09-30-calm-legacy-before-engine/`. |
| Does the v0 (tiles) page still work locally? | **Yes:** `app/legacy.html` and `app/index.v0.html` show the 6 tiles and open flows after «toque para entrar» (http and file://). Their only errors are external 404s (core theme CSS, `clocks.flac`). |
| Ambient audio | `assets.apollo.rio.br/audio/clocks.flac` (and `/audio/flac/clocks.flac`) → 404 on the asset host. |

Nothing was deleted. Pending: owner decision on what `app/index.html` should be.

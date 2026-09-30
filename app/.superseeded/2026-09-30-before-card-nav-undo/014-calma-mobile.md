# 014 · Calma mobile

Date: 2026-09-30  
Scope: visual and interaction refinement of the user-maintained `app/index.html` shell.

The page now uses a pure-black surface, a single chromatic breathing anchor, restrained neutral support tiles, safe-area sizing, and a compact two-bar audio control inspired by the Apollo dark design system. The audio control keeps the existing play/pause behavior and accessibility state while using `class="burger"` and `id="burger"`. The breathing anchor is a button around a local `calm-orb.html` iframe, so touch and keyboard pause/resume work even when the external CDN or audio host is unavailable.

Clinical copy, flow data, telephone destinations, and risk behavior were not changed. `calm-app.css` is loaded after the legacy stylesheet so the new page shell owns its visual layer without editing the shared legacy rules. The engine build was intentionally not run because it would replace the user-maintained `app/index.html` with the generated shell.

Checks completed:

- `node --check app/script.js`
- `node --check app/preloader.js`
- Chromium smoke pass at 390 × 844: black background, colored orb iframe, burger audio control, six support tiles, and pause/resume state.
- Screenshot: `app/_audit/calm-mobile-390-final.png`.

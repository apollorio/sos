# 001: Design "Abraço" (design layer only)

**Date:** 2026-09-23 · **Scope:** design, motion and handoff only. The flow graph, node text, clinical content and risk logic were **not changed**; per phase 000, content changes need clinical sign-off.
**Backups:** `sos/.superseeded/app pre-001-design 2026-09-23/` (index, style, script, preloader, isos) and `sos/.superseeded/index.gateway.pre-001-design.html`.

## Who we design for
The app has to work for someone who is anxious, angry, sad, high or alone, often at night on a phone. It should feel like a digital friend who stays close.

## Principles
1. **Nothing startles.** Motion follows breathing: 0.3 s out, 0.6–0.8 s in, `expo.out`. Nothing flashes or strobes, and no neon (someone watching may be on psychedelics).
2. **One thing at a time.** When a flow opens, the home screen steps back: the orb dims, blurs and shrinks, and the tiles leave (they become `inert` and hidden). While a node changes, the old one fades out before the new one fades in, and taps during the change are ignored, so there are no double-taps and no content jumping.
3. **Low light.** Dark mode stays, as your DS does. The background is `#060508`, text is warm off-white, and the hues are muted pastels. Red (`--c-red #de8a7e`, clay) appears only on emergency surfaces.
4. **Help never depends on JS.** 188/192 appear as static `tel:` links in three places: the preloader, the home strip (`.sos-strip`) and every sheet (the crisis bar, including the resume card).
5. **Going back to reality and returning is a choice, never a surprise.** Reopening a flow asks "continuar de onde parei / começar do início" instead of resuming silently (C9).
6. **The page stays calm.** Focus mode (zen) keeps the screen on (Wake Lock), goes fullscreen and shows a one-time tip about the phone's "Não perturbe". The app never asks for notification permission.

## What changed
| Area | File | Change |
|---|---|---|
| Handoff | `sos/index.html` | "Não tô bem" → veil to black plus a candle glow (0.95 s), then `sessionStorage sos-arrival`, then the page change (`@view-transition`). Reduced motion skips the veil. bfcache restores cleanly. |
| Arrival | `app/preloader.js` | Starts black. The glow is already lit when the user came from the gateway, so it looks like one continuous scene. Silences are shorter. Returning visitors in the same session see a SHORT sequence. "toque para entrar" appears after 2.6 s; one tap or a key enters. The 188/192 links are there from the first second. **C1** (52 s block) addressed. |
| Tokens and components | `app/style.css` | Full rewrite as the "Abraço" layer: tokens, even 3×2 tile grid, opaque sheet (max 560 px), focus ring, 48 px targets, landscape, one reduced-motion gate. |
| Markup | `app/index.html` | Tiles are `<button>`s. Zoom is allowed (removed `user-scalable=no`). Added `color-scheme: dark`, the static `.sos-strip`, and cache-busted assets. **C7** addressed. |
| Orb | `app/isos.html` | Magenta/cyan replaced with pearl-lavender and dusk-teal at 32/40 s. It pauses when the sheet is open, when the tab is hidden, and under reduced motion. |
| Behaviour | `app/script.js` | `setHomeQuiet`, breath-paced `renderNode` wrapper, choice feedback (`.is-chosen`), resume card, Wake Lock + fullscreen, softer orb halo, toast hold halved, localhost fetch removed from `applyOrbChromaGlow`. **C9** addressed. |

## Out of scope / still open
- **C3:** `plogAudio` in `script.js` still fires a debug `fetch` to `127.0.0.1` (visible as `ERR_CONNECTION_REFUSED`). Remove it before production.
- **C8:** audio autostart was not touched (it is a behaviour decision).
- **C2 / C4 / C5 / C6:** content, legal and clinical items were not touched.
- The gateway references `./preloader.js` and `./style.css`, which don't exist (404).
- Something POSTs to `/wp-json/apollo/v1/track/batch` (core.js telemetry). It returns 501 on the local server.
- `data.json` and `data.embed.js` have drifted apart. Not touched.

## Verified (2026-09-23, 375×812, localhost:8777)
Checked the gateway click → veil → app preloader (glow on, tel:188/192) → tap → home (3×2 grid, no horizontal scroll, AA faint text) → open "Pânico" (sheet, orb dimmed, tiles inert, focus inside the sheet) → choice (`.is-chosen`, crossfade) → "recolher" (home restored) → reopen (resume card).

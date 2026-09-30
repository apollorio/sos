# 015 · CardNav menu, discreet controls, delicate orb

Date: 2026-09-30
Scope: `app/index.html` shell (user-maintained), `calm-app.css`, new `calm-nav.js`, `calm-orb.html`, 4-line change in `script.js`.

## What changed

- **Burger is a real menu now.** ~~014: the two-bar mark toggled the ambient audio~~ → it opens the Apollo DS CardNav
  (ported from `_lib/DESIGN-SYSTEM_dark-mode-UI/claude.index.html` `NavCards`): GSAP height `back.out(1.3)` + staggered
  cards, CSS fallback without GSAP, closes on Escape / outside tap / link tap, `aria-expanded` + `aria-controls`.
  Burger sits at the extreme right; focus-mode button stays beside it.
- **Cards (owner copy):** 01 Linha do Tempo da Crise (live `[00h00m00s]` elapsed since the app opened, in memory only),
  02 Preciso de Ajuda agora! (WhatsApp share to a friend, `tel:192`, `tel:188`), 03 Dose de Consciência do Dia (primary).
  Items with no feature yet (Relatório, Compartilhar, Modo Médico, Curiosidade) carry `data-soon` and show a toast
  pointing to 188/192 instead of dead anchors.
- **WhatsApp:** the owner's `whatsapp://send?phone=55XXXXXXXXXXX` placeholder would fail; replaced with
  `https://wa.me/?text=…`, which opens the contact picker so the person chooses the friend.
- **Controls under the cards:** A−/A+ text size (0.9–1.4 via `--fs-scale` → CSS `zoom` on reading surfaces), play/pause
  (`#btn-audio`, reuses `SOS.toggleAudio`), volume range (`SOS.userVolume` is now the fade target in `script.js`).
  Text size and volume persist in localStorage as device conveniences; no health state.
- **Orb:** rebuilt after the owner's particle reference, but quieter: two radial lights crossfading + four small embers
  drifting out, transform/opacity only (compositor), static under reduced motion. Removed the legacy aura blur and rim
  shadow that rendered the orb as a rounded square.

## Checks

- `node --check` on `script.js`, `calm-nav.js`.
- Chromium 390 × 844: menu open/close (click, Escape), cards + controls visible and above the tiles, text size 100→120 %
  refits the menu, play → `aria-pressed=true`, volume 30 % applied live to the element, pause restores. Orb renders round.
- The ambient file on `assets.apollo.rio.br` did not load in the local preview (MEDIA_ERR_SRC_NOT_SUPPORTED); audio was
  verified with a generated WAV. Check on the real host.
- Engine build not run (it would overwrite this user-maintained `app/index.html`).

## 015b · Owner refinements (same day)

- Menu typography follows Von Restorff: one size (13px) and one weight (400) everywhere; hierarchy only by family
  (mono kicker/count/timer · Bricolage title · Space Grotesk links), colour and contrast. The only accent is the red
  path to «Chamar SAMU agora (192)».
- Cards 01 and 02: the label is a branched-tree head (Apollo DS BranchedMenu port) — folds its links, links grow from one
  trunk with elbows, the lit path runs trunk → leaf (default 01 → Relatório, 02 → 192; press/hover/focus relights).
  The bar glides with the fold. Rows are 40px touch targets.
- Footer controls: no surface, border or shadow on `.nav-controls` or its buttons; order A+ · A− · % · volume · play;
  volume defaults to 95 %, slider at opacity .35, 1px track, 9px thumb.
- Orb: breath range 0.7 → 1 (was 0.82), wider three-colour light, halo tied to `--orb-halo` so inhale/exhale is easy to follow.
- Tiles: per-flow hues restored from `style.css` (`--tile-hue`, tinted icon discs, red Resgate).
- Breathing text: mask fade — clearest next to the ball, softer above.
- Checked at 390 × 844 in Chromium: fold 685 → 565 → 685 px, text 140 % redraws the tree, breath scale 0.70 → 0.86 → … .

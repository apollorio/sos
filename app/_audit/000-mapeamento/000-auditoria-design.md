# 000 · Design audit (baseline for phase 001)

> Produced 2026-09-22 by a Sonnet sub-agent (read-only). Opus spot-checked it and added live-run observations, marked **[live]**.
> Files: `index.html`, `style.css`, `preloader.js`, `script.js`, `isos.html`, `isos2.html`, `iframe-to-ij-protected.html`.

## 1. Design tokens
- They live in `style.css:7-64` (`:root`).
- **Color**
  - `--bg #060508`, `--bg-elev #0c0a11` (never used), `--bg-glass`
  - Text: `--text #c5c1d0`, `--text-soft #827e8f`, `--text-faint #5f5b69`
  - Borders: `--border-sub` and `--border-soft`, at 5.5% and 9% white
  - Accents: `--c-magenta #f0f`, `--c-cyan #0ff`, `--c-purple #a855f7`, `--c-blue #3b82f6`, `--c-red #ef4444`, `--c-success #34d399`
  - `--tint-*` surfaces are built with `color-mix()` (`:25-32`)
  - `--orb-h1/h2/h3` are declared but never read. Only `--ambient-hue` is used.
- **Radii:** `--r-sm/md/lg/pill`.
- **Spacing:** there is no spacing scale. Padding is hard-coded rule by rule.
- **Type:** `--ff-body` and `--ff-head`, plus `--fs-xs…xl` (12→26 px, fixed px, no `clamp()`).
- **Motion:** there are **no tokens.** There are 14+ distinct durations (.18s→2.8s) and mixed easings (`ease`, 2 cubic-beziers, GSAP power2/3).
- **z-index:** literals only (0, 2, 3, 10, 20, 40, 55, 60).
- **Orb scale:** `script.js:375` reads `--orb-scale-min` and `--orb-scale-max`, but CSS never defines them, so JS falls back to 0.68/1.06.
- **Inline styles in `index.html`:** 6 icon-tint `rgba()` backgrounds (`:116-151`) that bypass `--tint-*`, the mote positions, and the `#btn-zen` font-size.

## 2. Typography
- **Faces:** Bricolage Grotesque for headings and Space Grotesk for body.
  - Both are loaded **twice**: once by `@import` in `style.css:6` (which also pulls in an unused SUSE Mono) and once by `<link>` in `index.html:47`.
  - The full weight ranges (200–800 and 300–700) are loaded, but only about 3 weights are used.
- **Line heights:** 1.45 body, 1.58 node text. Comfortable to read under stress.
- **Contrast on `#060508`:**
  - `--text` ≈ 11.5:1 (AAA).
  - `--text-soft` ≈ 5.2:1 (AA).
  - **`--text-faint` ≈ 3.1:1, which fails AA.** It's used at 10.5–12 px for `.opt-sub`, `.caps-meta`, `.caps-addr`, `.evidence-hint` and the progress label.
  - `.breathe-sub` is `text-faint` at `opacity:.2`, about **0.6:1**. The onboarding hint is effectively invisible.

## 3. Layout and grid
- The app shell is one screen with no scrolling (`html,body{overflow:hidden}`). It has three absolute zones: header, orb-zone and options-zone.
- The sheet is `max-height:84dvh`.
- Safe-area insets are used for the header, orb and sheet.
- **Options use flex-wrap, not a grid:** 4 columns up to 767 px, 5 columns from 768–998 px, 6 columns from 999 px.
  - **[live]** At 375 px, `wrap-reverse` plus `flex-end` gives a 4 + 2 pyramid with the pair right-aligned on top. "Resgate" (emergency) lands top-right.
- There is **no landscape rule** and no desktop layout: the sheet runs full width.
- **[live]** The sheet is translucent. During its entrance, the orb and the breathing phrases show through the flow text.

## 4. Components
| Component | Existing states | Missing |
|---|---|---|
| Header icon buttons (zen, audio) | default, :active, .zen | :focus-visible. The 42 px target is under 44 px. |
| Orb iframe | breathing, .paused, reduced-motion scale | Pause on hidden tab (`visibilitychange`) |
| Option tile | default, :active, icon :hover | focus |
| Bottom sheet | GSAP open/close | focus trap, focus return, `inert` background |
| Progress bar | width tween | `role=progressbar`. It is also based on key order, so it jumps. |
| Choice and action buttons (`.danger`) | :active | focus |
| Task card (default, breath, crt, media, contact, call/sms) | default, completed, play/check | :disabled styling (JS disables `.crt-start`) |
| Breath guide | phase, counter, cycle | Audio or haptic cue per phase |
| Crisis bar (CVV / SAMU) | normal, --high | Not shown in `torto` |
| CAPS card | featured / normal | Verified-at badge; distance |
| Toast | fade timeline | Dismissal. **[live]** The welcome toast stays about 11.5 s. |
| Sheet close ("recolher — fico por perto") | none | none |

Across the whole app: `:focus-visible` is implemented nowhere, and `:disabled` styling is implemented nowhere.

## 5. Motion
- **Keyframes:**
  - `aurora-drift`: 38 s, infinite
  - `mote-float`: 19–33 s
  - `isos.html` blob `loop`: 20–25 s
- **GSAP:**
  - Breathing timeline (12 s cycle, infinite, 2.8 s delay)
  - An orb-glow ticker that recomputes 5 stacked box-shadows **every frame**
  - Phrase fades, sheet tweens, zen fades, toast, task pop
- **Reduced motion is shallow:** it only freezes `.orb-stage` at scale .88. The aurora, motes, blob loop, breathing timeline and glow ticker all keep running.
- **Overstimulation risk:** pure magenta and cyan, heavily blurred, drifting non-stop as the focal point. It only stops if you tap it.

## 6. Orb
- `isos.html` is pure CSS: two radial-gradient blobs with `blur(11vmin)` and transform keyframes. It listens for `iso-pause` and `iso-play` messages.
  - It's cheap on the CPU, but the large blur is expensive to paint on low-end GPUs, and it never pauses when the tab is hidden.
- `isos2.html` is a leftover CodePen demo. It's unused.
- `iframe-to-ij-protected.html` is an unrelated sandboxed loader that decodes `atob('aWouaHRtbA==')` → `ij.html`. The target doesn't exist here. It's unused and should be archived.

## 7. Preloader
- It's synchronous in `<head>`.
- **It starts with `forceGlobalWhite()`**, a white flash, then fades to black.
- It has 5 lines plus pauses, ≈35 s of hold time. **[live]** Measured at **52.8 s** before the UI became usable.
- Any tap skips it, but nothing tells the user that.
- The 90 s safety net is in `script.js:1715-1730`.
- The last line promises anonymity (see C2 in the main report).

## 8. Accessibility
- Good:
  - `lang=pt-BR`
  - dialog role and aria-modal
  - live regions on the breathing text and toast
  - most targets are 48 px or larger
  - icons are `aria-hidden`
  - Esc closes the sheet
- Problems:
  - **`user-scalable=no`** (WCAG 1.4.4)
  - no focus management
  - no `:focus-visible`
  - `--text-faint` contrast
  - the header buttons are 42 px
  - the manual 280 ms double-tap block in `touchend` can swallow fast repeated taps; `touch-action` would be safer

## 9. "Webpage vs premium app" gaps
- There's no manifest, service worker or offline support, although the app-capable meta tags are present.
- **[live]** `core.js` pulls in about 25 more files:
  - jQuery 4, a second GSAP, ScrollTrigger, Observer, Lenis, Flip, SplitText, MotionPath, MorphSVG, TextPlugin
  - popper, translate, morphism, tooltips
  - an Apollo tracking batch
  - remote SVG icons
- None of them use SRI.
- `showOverlay()` has no `typeof gsap` guard. If the GSAP CDN fails, the sheet with the phone numbers never opens.
- `overscroll-behavior` isn't set.
- Haptics only happen on task completion (4 ms).
- **[live]** When audio fails, the user sees a toast: "não consegui tocar o som. tenta de novo."

## 10. Crisis-specific UX
- The near-black ground is right for OLED screens and low light. The neon accents on the orb contradict it.
- There's no Wake Lock, so the screen can sleep mid-breathing.
- There are no permission prompts (good). The localhost debug fetches, however, can trigger a local-network permission prompt.
- There's no `tel:` link without JS.
- **Taps to help:** Resgate → `tel:192` takes 2 taps. The Pânico and Solidão crisis bars take 2 taps. Other flows take 8–14 steps.

## 11. Top 15 issues
| # | Severity | Issue | Direction |
|---|---|---|---|
| 1 | Critical | The preloader blocks help for about 50 s and flashes white | Start dark, make it short or clearly skippable, keep tiles live |
| 2 | Critical | Emergency numbers exist only through JS; the sheet has no GSAP guard | Static `tel:` fallback; guard |
| 3 | Critical | Reduced motion is ignored except for the orb's scale | One global motion gate |
| 4 | High | `user-scalable=no` | Remove |
| 5 | High | No `:focus-visible` | Focus ring token |
| 6 | High | No focus trap or return in the dialog | Focus into sheet, `inert` background |
| 7 | High | `--text-faint` fails AA at small sizes | Lighten it, or use it only for decoration |
| 8 | High | Many CDNs, no SRI, no offline | Self-host critical assets; PWA |
| 9 | High | The `core.js` payload (jQuery, Lenis, 10 GSAP plugins, tracking) on a crisis page | Don't load it on SOS |
| 10 | Med | No Wake Lock during breathing | Request it while breathing is active |
| 11 | Med | `.breathe-sub` is about 0.6:1 | Raise it |
| 12 | Med | No motion, space or z tokens; inline tints | Build the token scales |
| 13 | Med | No landscape or desktop layout; uneven tile pyramid | Grid spec in 001 |
| 14 | Low | Saturated neon orb | Muted, analogous palette |
| 15 | Low | Dev leftovers (`isos2.html`, debug fetches) | Archive and strip |

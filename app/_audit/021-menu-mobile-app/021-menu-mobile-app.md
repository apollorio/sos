# 021 · Menu burger → mobile-first app sheet

Date: 2026-09-30 · Scope: `app/index.html` (menu markup), `app/calm-app.css` (menu block). No JS, no copy, no links changed.

## Findings (before)

| # | Finding | Evidence |
|---|---------|----------|
| F1 | Menu links rendered at `--fs-p4` ≈ 9–12 px, 40 % opacity: "desktop site" look, unreadable on a phone | `a.nav-card-link { font-size: var(--fs-p4); color: var(--muted) }` |
| F2 | Links had no touch area (inline text, ~15 px tall) | no min-height / padding |
| F3 | Card eyebrow used an undefined token `--fs-p5` | `.nav-card-label small` |
| F4 | Burger hit area ~30 px (< 44 px) | `.burger { padding: 5px }` |
| F5 | Menu taller than a short phone was clipped (nav `overflow: hidden`, no inner scroll) | `calm-nav.js target()` clamps height to viewport |
| F6 | Translucent cards: page tiles bled through the open menu | `rgba(15,15,15,.72)` + weak scrim `.12` |
| F7 | Controls row: 32 px targets, `&nbsp;` spacer, A+ before A−, 1 px volume track at 35 % opacity | markup + `.nav-ctl`, `.nav-vol` |

## Changes

- Grouped inset list (iOS/Android settings pattern): each card = header (mono eyebrow 10.5 px + 17 px title) + rows.
- Rows: 52 px min-height, 15.5 px text, inset hairline dividers, full-width press state, trailing ↗ disclosure.
- `tel:192` row tinted (emergency reads first); inverted card 03 kept, now opaque.
- Open menu = solid sheet (`#0b0b0c`, opaque cards), page scrim `.6`.
- `card-nav-content` scrolls inside itself (`overflow-y: auto`, `overscroll-behavior: contain`, safe-area bottom).
- Burger 44 × 44. Controls: A− · 100 % · A+, 44 px targets, flexible 3 px volume track with 18 px thumb, round play button.
- `calm-app.css?v=1.4.0` cache-bust.

## Verified (Chromium, localhost:5178)

- 375 × 812: link 15.5 px / 52 px tall, burger 44 px, nav opens to 782 px, all groups + controls visible, no bleed-through.
- 375 × 667: nav clamps to 651 px, content scrolls (722 > 595).
- No new console errors (remaining are pre-existing CDN CORS/404 and local `POST` 501).

## Not done

- Reduced-motion and GSAP open/close behaviour unchanged (calm-nav.js untouched).
- Legacy page and engine shell not touched.

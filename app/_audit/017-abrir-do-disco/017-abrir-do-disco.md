# 017 · Opening the app from the disk (file://)

Date: 2026-09-30
Owner report: double-clicking `app/index.html` showed only the static 192 shell ("the app is broken").

## Finding

Not broken: that is the fail-to-shell design (L11) doing its job. Chrome refuses `<script type="module">` and
Subresource Integrity on `file://` (no origin, no CORS), so the engine bundle never ran. On `http(s)://` it ran.
A diagnostic session (df7be7) had left a probe in `index.html` posting to `http://127.0.0.1:7903` and a relaxed
`connect-src`: removed, files kept in `.superseeded/2026-09-30-debug-df7be7/`.

## Fix

- `scripts/build.ts` also bundles the engine and the report pages as classic scripts
  (`assets/{app,report}.<hash>.classic.js`) and stamps them into `app/file-boot.js`'s `data-bundle`.
- `app/file-boot.js` (tiny, classic, precached) injects that copy **only** when `location.protocol === "file:"`.
  On http(s) it returns at once and the SRI-checked module bundle runs as before. CSP unchanged.
- One engine per page (`__sosEngine` / `__sosReport` guards) for browsers that do allow modules on file://.
- Ambient sound: both known URLs (`assets.apollo.rio.br/audio/clocks.flac`, `/audio/flac/clocks.flac`) are 404 on the
  asset host; the control now disables itself after the first failure instead of retrying. **The file must be uploaded.**

## Checks

- Unit 224/224, `build:check` green, `tsc` clean.
- e2e (Chromium 151, Windows): shell 24/24 (incl. offline + SW update), **file:// 7/7 (new)**, report 8/8, legacy 9/9.
  From the disk: first card in < 1 s, panic path with the orb, Modo Médico opened from the disk follows the app live.
- Lab e2e: pre-existing radio `check()` timeout on this browser build (see 016), unchanged.

# SOS Apollo — Harm-Control Runtime

Free, login-free, offline harm-control PWA. A **deterministic, exhaustively verified decision engine**. It feels like an intelligent assistant (it asks only what could change what happens next, remembers commitments, and explains every decision) with **no LLM and no server**.

> Read first: **[docs/BLUEPRINT.md](docs/BLUEPRINT.md)** (audit · architecture · diagrams · decisions to approve)

## Commands

```bash
npm install
npm run verify            # everything below, in order
npm run registry:format   # canonical formatting of registry + locale
npm run registry:codegen  # registry.json → src/generated/registry.gen.ts (literal types)
npm run registry:lint     # referential integrity (add -- --release for the production gate)
npm run typecheck         # tsc --strict
npm test                  # scenarios · properties · lint mutations · architecture · triggers (~5 s)
npm run test:exhaustive   # 3.5 M-state proof (~3 min)
npm run simulate [name]   # print what a person would see, step by step, with the "why"
npm run build             # public/app.js (80 KB · 25 KB gz)
npm run e2e               # real Chromium: 192 with JS off, after a crash, 2 taps to P0
npx tsx scripts/build-demo.ts   # dist/simulator.html — the engineering simulator
```

## The rule of this repository

**Behavior is data.** To change what the app does, edit `registry/registry.json` (and the copy in `registry/locales/`), then run `npm run verify`. The code in `src/core` is a generic, pure engine. It changes only when the *kind* of behavior changes, not the behavior itself.

## Status

Engineering base: ✔ built and verified. Clinical copy: ✖ draft, see `docs/CLINICAL-REVIEW.md`. Not for real-world use until the release gate passes.

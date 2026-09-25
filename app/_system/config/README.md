# SOS Apollo — Harm-Control Runtime

Free, login-free, offline harm-control PWA. A **deterministic, exhaustively verified decision engine**. It feels like an intelligent assistant (it asks only what could change what happens next, remembers commitments, and explains every decision) with **no LLM and no server**.

> Read first: **[docs/BLUEPRINT.md](../docs/BLUEPRINT.md)** (v0.1 · what is built) and **[docs/BLUEPRINT-v0.2-CONTINUITY.md](../docs/BLUEPRINT-v0.2-CONTINUITY.md)** (v0.2 · the continuity plane). Project-wide rules live in the repository root `CLAUDE.md`.
>
> `package.json`, `tsconfig.json` and `vitest.config.ts` live at the `_system` root (every script resolves paths from there). This folder keeps the command reference.

## Commands

```bash
npm install
npm run verify            # everything below, in order
npm run registry:format   # canonical formatting of registry + locale
npm run registry:codegen  # registry.json → src/generated/registry.gen.ts (literal types)
npm run registry:lint     # referential integrity (add -- --release for the production gate)
npm run typecheck         # tsc --strict
npm test                  # scenarios · properties · lint mutations · architecture · triggers · continuity · handoff · trust (~8 s)
npm run test:exhaustive   # 3.5 M-state proof (~3 min)
npm run simulate [name]   # print what a person would see, step by step, with the "why"
npm run build             # app/ (the deployed /app/): assets/app.<hash>.js + SRI + stamped sw.js + beta/release channel;
                          # then dist/simulator.html and the beta lab app/lab/ (hub, missions, clinical review, simulator)
npm run build:check       # fail if app/, dist/simulator.html or app/lab/ is not what the current sources produce
npm run e2e               # real Chromium on the repository root as deployed: shell (192 with JS off, after a crash, 2 taps to
                          # P0, beta notice, CSP, SRI refusal, v1→v2 update, offline reload) + lab (gateway → /app/, review
                          # and mission feedback round trip, reset)
npm run e2e:legacy        # real Chromium on the legacy page (/app/legacy.html): 192 clickable in every flow with the CDN down, 12 h progress expiry
npm run review:summary -- <file.json>   # a clinician's exported review → Markdown for docs/CLINICAL-REVIEW.md (read-only)
npx tsx scripts/build-demo.ts   # dist/simulator.html alone — the engineering simulator
```

## The rule of this repository

**Behavior is data.** To change what the app does, edit `registry/registry.json` (and the copy in `registry/locales/`), then run `npm run verify`. The code in `src/core` is a generic, pure engine. It changes only when the *kind* of behavior changes, not the behavior itself.

## Status

Engineering base v0.1: ✔ built and verified. Continuity plane v0.2 (journal · snapshot · priors · Crisis Passport · capsules · vault identity · sync queue): ✔ built locally with tests; vault server ☐ (see `docs/api/VAULT-PROTOCOL.md`). Clinical copy: ✖ draft, see `docs/CLINICAL-REVIEW.md`. Not for real-world use until the release gate passes.

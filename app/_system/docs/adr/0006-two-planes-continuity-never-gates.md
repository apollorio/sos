# ADR-0006 · Two planes: continuity never gates the acute core

**Status:** accepted (v0.2) · **Laws:** L13, L19 · **Invariant:** INV-019

## Context
v0.2 adds a remote, 180-day, pseudonymous continuity vault. A backend, a database and a network are now part of the system.
In a crisis the network is exactly what fails (no 4G in a club, dead backend, expired certificate).

## Decision
The engine is split into two planes that share one artefact, `StepResult`:
- **Acute Safety Plane** (`src/core` v0.1): decides the card first, locally, synchronously. Unchanged.
- **Continuity Plane** (`src/core/journal`, `src/core/continuity`, `src/core/handoff`, `src/runtime/continuity`, `src/runtime/trust`):
  consumes `StepResult` after the fact and feeds back only `priors`.
The engine loop order is fixed: `process → persist → journal → effects → render → arm timer → (async) sync`. A sync error is
swallowed by design and can never alter the card.

## Consequences
- `npm run test:exhaustive` still proves the acute plane alone; priors are proven not to widen the reachable card set.
- The vault can be deleted, offline or compromised and the app still reaches 192 in two taps.
- No "POST /decide". The server never decides anything.

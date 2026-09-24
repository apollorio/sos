# ADR-0001 · Deterministic core, no LLM in v1

**Status:** proposed · **Date:** 2026-09-23

## Context
Brainstorm v1 put an LLM in the loop (signal extraction + response composition). v2/v3 removed it.
Harm-control decisions are safety-critical, used offline, under stress, by people who may be intoxicated.

## Decision
The decision engine is a pure TypeScript function over registry data. No model, no network, no randomness.
"Intelligence" comes from (a) event-sourced state with TTL and semantic invalidation, (b) ordered hard rules,
(c) ordinal risk tables, (d) counterfactual value-of-information question selection (ADR-0004), (e) commitments.

## Consequences
+ Exhaustively verifiable (finite state space), explainable per decision, works in airplane mode, ~25 KB gz.
+ No automation bias from fluent-but-wrong text; no prompt injection surface; no data leaves the device.
− No open conversation. Free text only fires local triggers (ADR-0003 of the brainstorm, law L07).
− Every new behavior must be expressed as data + reviewed. That is the point.

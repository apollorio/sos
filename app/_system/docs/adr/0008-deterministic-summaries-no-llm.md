# ADR-0008 · Crisis summaries are deterministic templates, never an LLM

**Status:** accepted (v0.2) · **Laws:** L15, L16 · **Invariants:** INV-022, INV-023

## Context
The Crisis Passport may be read by a friend or by a clinician when the person cannot explain what happened. Facts must not
be embellished, dropped or invented, and the timeline must be exact.

## Decision
`buildCrisisSummary()` is a pure function over the journal + snapshot that keeps `reported` (explicit provenance) and
`derived` (engine interpretations) in separate lists, and `renderSummary()` fills locale templates. Both are unit-tested
with golden outputs. A lexicon test forbids diagnostic vocabulary (`continuity.forbiddenInference`).

## Consequences
- Summaries are reproducible byte for byte and auditable against the journal.
- An LLM may some day help with optional, private journaling in P3; it never writes the authoritative passport.

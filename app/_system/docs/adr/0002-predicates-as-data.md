# ADR-0002 · Rules are JSON predicates, not code

**Status:** proposed

## Decision
Hard rules, risk rows, band rules, policies, strategy conditions and requirements are expressed in a tiny
predicate DSL (`all/any/not/eq/neq/in/gte/lte/known/unknown/always`) inside `registry/registry.json`.

## Why
1. Clinicians and reviewers can read and diff rules without reading TypeScript.
2. `evaluate()` returns the leaves that made a rule true → the decision log is generated from the same tree
   that decided. The explanation cannot drift from the logic.
3. The linter type-checks every path and literal against the fact catalog before runtime.

## Cost
A 90-line evaluator to maintain. No arithmetic, no functions, no loops — by design.

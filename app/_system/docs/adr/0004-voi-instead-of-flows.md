# ADR-0004 · Questions are chosen by value of information, not by a flow

**Status:** proposed

## Decision
There is no questionnaire. For every askable question the engine simulates each answer through the real pure
pipeline (`decideCore`) and classifies the question:
- **critical** — some answer yields P0 → asked before anything else
- **decisive** — some answer changes the next action → asked if the band's budget allows and nothing is on screen
- **irrelevant** — asked never

## Consequences
+ The Akinator effect: it asks exactly what could change what happens next, in an order that emerges from risk.
+ Monitoring emerges for free: when a TTL expires (breathing normal → unknown after 10 min), the question
  becomes critical again and is re-asked.
− ~20 pure evaluations per step (≈0.7 ms on a laptop; budget ≤ 16 ms on low-end Android).

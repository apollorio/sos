# ADR-0003 · No captcha before help. Human steps are calming, never gating.

**Status:** proposed

## Context
Request: captcha "games" / "human steps" to hold bots and attacks.

## Analysis
- v1 has **no server endpoint that does anything**: all handoffs are native links (`tel:`, `sms:`, `wa.me`)
  executed by the user's own phone inside their own gesture. A bot can load the static page — and gain nothing.
- A gate before the first card delays P0 and adds stress, contradicting L05 and L12.
- The real abuse vector appears only if a server starts sending SMS/pings on the user's behalf (v2): SMS pumping /
  toll fraud is a known attack on exactly that kind of endpoint.

## Decision
- v1: zero entry gate. Static CDN + strict CSP + no third-party scripts.
- The breath pacer (grounding) is the "human step": a calming micro-interaction, never a gate.
- v2 server effects (relay to a pre-consented contact, welfare check on silence) are the ONLY things gated:
  invisible Turnstile + proof-of-work + per-device/IP rate limits + country allowlist — and never in P0/P1.

# ADR-0005 · Native handoffs, no backend in v1

**Status:** proposed

## Decision
Contacting people is a handoff to the phone's own apps: `tel:192`, `tel:188`, `https://wa.me/?text=…`,
`sms:?&body=…`. The app never stores a phone number, never knows if a message was sent (L01), and needs no server.

## Consequences
+ Zero PII, zero cost, zero abuse surface, works with any carrier; WhatsApp-first fits Brazil.
− The app cannot contact anyone automatically on silence. v1 compensates with bystander mode
  (screen readable by anyone nearby + wake lock + vibration). Automatic escalation = v2, opt-in, gated (ADR-0003).

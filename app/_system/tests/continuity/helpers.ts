/** Shared fixtures for the continuity/handoff/trust suites. Not a test file. */
import fc from "fast-check";
import { processEvent, startSession } from "../../src/core/process-event";
import { REG } from "../../src/core/registry";
import type { RawInput } from "../../src/core/domain/events";
import type { StepResult } from "../../src/core/domain/decision";
import { emptyJournal, appendEvents, journalStep, type Journal } from "../../src/core/journal/journal";

export const TEXTS = ["não consigo respirar", "meu amigo apagou", "quero morrer", "oi tudo bem", "tô em perigo aqui na rua"];
export const T0 = 1_800_000_000_000;

export type G =
  | { k: "tap"; pick: number; dt: number; actionId?: string }
  | { k: "text"; text: string; dt: number }
  | { k: "rt"; ev: "APP_HIDDEN" | "APP_VISIBLE" | "ONLINE" | "OFFLINE" | "TICK"; dt: number }
  | { k: "shell"; dt: number };

export const stepArb: fc.Arbitrary<G> = fc.oneof(
  { weight: 8, arbitrary: fc.record({ k: fc.constant("tap" as const), pick: fc.nat(9), dt: fc.integer({ min: 1, max: 60 }) }) },
  { weight: 2, arbitrary: fc.record({ k: fc.constant("text" as const), text: fc.constantFrom(...TEXTS), dt: fc.integer({ min: 1, max: 60 }) }) },
  { weight: 3, arbitrary: fc.record({ k: fc.constant("rt" as const), ev: fc.constantFrom("APP_HIDDEN" as const, "APP_VISIBLE" as const, "ONLINE" as const, "OFFLINE" as const, "TICK" as const), dt: fc.integer({ min: 1, max: 900 }) }) },
  { weight: 1, arbitrary: fc.record({ k: fc.constant("shell" as const), dt: fc.integer({ min: 1, max: 60 }) }) },
);

/** A tap by explicit action id (e.g. "helper", "none", "mistake"). */
export const tap = (actionId: string, dt = 2): G => ({ k: "tap", pick: 0, dt, actionId });

export function runWithJournal(steps: G[], sessionId = "J"): { results: StepResult[]; journal: Journal; inputs: RawInput[] } {
  let t = T0;
  let r = startSession(sessionId, t);
  let j = emptyJournal(sessionId);
  const boot: RawInput = { kind: "boot", id: `boot:${sessionId}`, at: t, sessionId };
  j = appendEvents(j, journalStep(j, null, r, boot, REG));
  const results = [r];
  const inputs: RawInput[] = [boot];
  steps.forEach((g, i) => {
    t += g.dt * 1000;
    const id = `j${i}`;
    const card = r.state.card!;
    let input: RawInput;
    if (g.k === "tap") {
      if (g.actionId) { input = { kind: "tap", id, at: t, cardInstanceId: card.instanceId, actionId: g.actionId }; }
      else {
      const acts = card.actions.filter((a) => !["wipe", "restart", "end_session", "im_fine_end"].includes(a.id));
      const a = (acts.length ? acts : card.actions)[g.pick % Math.max(1, (acts.length ? acts : card.actions).length)]!;
      input = { kind: "tap", id, at: t, cardInstanceId: card.instanceId, actionId: a.id };
      }
    } else if (g.k === "text") input = { kind: "text", id, at: t, text: g.text };
    else if (g.k === "rt") input = { kind: "runtime", id, at: t, event: g.ev };
    else input = { kind: "shell", id, at: t, action: "call_192" };
    const next = processEvent(r.state, input);
    j = appendEvents(j, journalStep(j, r.state, next, input, REG));
    results.push(next);
    inputs.push(input);
    r = next;
  });
  return { results, journal: j, inputs };
}


export { synthHistory } from "../../src/demo/history-fixture";

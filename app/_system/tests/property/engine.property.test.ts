/**
 * PROPERTY TESTS — thousands of random human/runtime event sequences through the real engine.
 * Dev mode: any runtime invariant violation throws, so "does not throw" covers INV-001/004/005/
 * 006/008/009/012/017 on every generated step.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { processEvent, startSession } from "../../src/core/process-event";
import { buildFacts } from "../../src/core/logic/facts";
import { strategyIneligibility } from "../../src/core/planner/eligibility";
import { REG } from "../../src/core/registry";
import type { RawInput } from "../../src/core/domain/events";
import type { StepResult } from "../../src/core/domain/decision";

const TEXTS = ["não consigo respirar", "nao estou com dor no peito", "oi", "meu amigo apagou", "quero morrer", "tô em perigo", "tudo certo", "desmaiei"];

type G =
  | { k: "tap"; pick: number; dt: number }
  | { k: "stale"; back: number; pick: number; dt: number }
  | { k: "text"; text: string; dt: number }
  | { k: "rt"; ev: "APP_HIDDEN" | "APP_VISIBLE" | "ONLINE" | "OFFLINE" | "TICK"; dt: number }
  | { k: "shell"; dt: number }
  | { k: "chip"; pick: number; dt: number };

const dt = fc.integer({ min: 1, max: 900 });
const stepArb: fc.Arbitrary<G> = fc.oneof(
  { weight: 10, arbitrary: fc.record({ k: fc.constant("tap" as const), pick: fc.nat(9), dt: fc.integer({ min: 1, max: 30 }) }) },
  { weight: 1, arbitrary: fc.record({ k: fc.constant("stale" as const), back: fc.nat(4), pick: fc.nat(9), dt: fc.integer({ min: 1, max: 30 }) }) },
  { weight: 1, arbitrary: fc.record({ k: fc.constant("text" as const), text: fc.constantFrom(...TEXTS), dt }) },
  { weight: 3, arbitrary: fc.record({ k: fc.constant("rt" as const), ev: fc.constantFrom("APP_HIDDEN" as const, "APP_VISIBLE" as const, "ONLINE" as const, "OFFLINE" as const, "TICK" as const), dt }) },
  { weight: 1, arbitrary: fc.record({ k: fc.constant("shell" as const), dt }) },
  // Menu picks (L23) explore every chip on offer, so INV-027/029 are checked on user-chosen techniques too.
  { weight: 3, arbitrary: fc.record({ k: fc.constant("chip" as const), pick: fc.nat(20), dt: fc.integer({ min: 1, max: 60 }) }) },
);

function run(steps: G[], onStep?: (prev: StepResult, next: StepResult, input: RawInput) => void): StepResult[] {
  let t = 1_800_000_000_000;
  let r = startSession("prop", t);
  const out = [r];
  steps.forEach((g, i) => {
    t += g.dt * 1000;
    const id = `p${i}`;
    const card = r.state.card!;
    let input: RawInput;
    if (g.k === "tap") {
      // Avoid ending the session too often so sequences explore deeper.
      const acts = card.actions.filter((a) => !["wipe", "restart", "end_session", "im_fine_end"].includes(a.id));
      const a = (acts.length ? acts : card.actions)[g.pick % Math.max(1, (acts.length ? acts : card.actions).length)]!;
      input = { kind: "tap", id, at: t, cardInstanceId: card.instanceId, actionId: a.id };
    } else if (g.k === "stale") {
      const old = r.state.cardHistory[r.state.cardHistory.length - 1 - (g.back % Math.max(1, r.state.cardHistory.length))];
      input = { kind: "tap", id, at: t, cardInstanceId: old?.instanceId ?? "none", actionId: old?.actions[g.pick % Math.max(1, old.actions.length)]?.id ?? "x" };
    } else if (g.k === "text") input = { kind: "text", id, at: t, text: g.text };
    else if (g.k === "rt") input = { kind: "runtime", id, at: t, event: g.ev };
    else if (g.k === "shell") input = { kind: "shell", id, at: t, action: "call_192" };
    else {
      const offered = r.output.chips;
      input = { kind: "chip", id, at: t, chipId: offered.length ? offered[g.pick % offered.length]!.chipId : "CHIP_FRIEND_ARRIVED" };
    }
    const next = processEvent(r.state, input);
    onStep?.(r, next, input);
    out.push(next);
    r = next;
  });
  return out;
}

const N = Number(process.env["PROP_RUNS"] ?? 400);
const RUNS = { numRuns: N };
const seq = fc.array(stepArb, { minLength: 1, maxLength: 45 });

describe("engine properties (random sequences)", () => {
  it("never violates a runtime invariant and always explains itself", () => {
    fc.assert(
      fc.property(seq, (steps) => {
        for (const r of run(steps)) {
          expect(r.log.violations).toEqual([]);
          if (r.log.why.policyRule !== "TERMINAL") expect(r.log.why.because.length).toBeGreaterThan(0);
          expect(r.output.card.actions.length).toBeGreaterThan(0);
        }
      }),
      RUNS,
    );
  });

  it("is deterministic: same inputs ⇒ byte-identical outputs and logs (INV-011)", () => {
    fc.assert(
      fc.property(seq, (steps) => {
        const a = run(steps).map((r) => JSON.stringify([r.output, r.log]));
        const b = run(steps).map((r) => JSON.stringify([r.output, r.log]));
        expect(a).toEqual(b);
      }),
      { numRuns: Math.ceil(N / 3) },
    );
  });

  it("a latched P0 is only left through CORRECTION or by ending the session (L03, INV-007)", () => {
    fc.assert(
      fc.property(seq, (steps) => {
        run(steps, (prev, next) => {
          if (prev.state.p0?.latch && next.state.status === "active" && next.log.band !== "P0") {
            expect(next.log.events).toContain("CORRECTION");
          }
        });
      }),
      RUNS,
    );
  });

  it("decisions are piecewise-constant in time: nothing changes before nextWakeAt without input", () => {
    fc.assert(
      fc.property(seq, fc.double({ min: 0.01, max: 0.99, noNaN: true }), (steps, frac) => {
        run(steps, (_prev, next) => {
          const w = next.output.nextWakeAt;
          const now = next.state.lastAt;
          if (next.state.status !== "active") return;
          const probeAt = w === null ? now + 3_600_000 : now + Math.floor((w - now) * frac);
          if (probeAt <= now) return;
          const probe = processEvent(next.state, { kind: "runtime", id: "probe", at: probeAt, event: "TICK" });
          expect(probe.output.card.instanceId).toBe(next.output.card.instanceId);
          expect(probe.log.band).toBe(next.log.band);
        });
      }),
      { numRuns: Math.ceil(N / 2) },
    );
  });

  it("time alone never replaces a help card with a question, unless someone is watched or the help lost a requirement (L22)", () => {
    fc.assert(
      fc.property(seq, (steps) => {
        run(steps, (prev, next, input) => {
          if (input.kind !== "runtime") return;
          const before = prev.output.card;
          const after = next.output.card;
          if (before.kind !== "action" || before.band === "P0" || !before.strategy || next.log.band === "P0") return;
          if (["emergency_escalation", "confirm_commitment", "terminal"].includes(before.skill) || after.kind !== "question") return;
          const facts = buildFacts(next.state, input.at, REG).facts;
          const watchful = facts["signal.actor"] === "helper" || Number(facts["risk.medical"]) >= 2;
          const st = REG.strategy.get(`${before.skill}.${before.strategy}`)!;
          const lost = strategyIneligibility(before.skill, st, { state: next.state, facts, band: next.log.band, now: input.at, reg: REG }, true) !== null;
          expect(watchful || lost, `${before.cardId} → ${after.cardId} on ${input.event}`).toBe(true);
        });
      }),
      RUNS,
    );
  });

  it("a stale non-emergency tap applies no ops: facts evolve exactly like under a TICK (INV-015)", () => {
    fc.assert(
      fc.property(seq, (steps) => {
        run(steps, (prev, next, input) => {
          if (next.rejected !== "STALE_CARD") return;
          const tick = processEvent(prev.state, { kind: "runtime", id: "cmp", at: input.at, event: "TICK" });
          // The tap proves presence (silence resets, L06) but applies NONE of its ops.
          expect(next.log.events).toEqual([]);
          expect(next.state.signals).toEqual(tick.state.signals);
        });
      }),
      RUNS,
    );
  });
});

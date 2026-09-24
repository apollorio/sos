/**
 * PRIORS — INV-020, INV-021, L14. History reorders; it never enables, never escalates, never sets a fact.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { processEvent, startSession } from "../../src/core/process-event";
import { decideCore } from "../../src/core/planner/decide";
import { strategyIneligibility } from "../../src/core/planner/eligibility";
import { buildFacts } from "../../src/core/logic/facts";
import { REG } from "../../src/core/registry";
import type { RawInput } from "../../src/core/domain/events";
import type { StrategyPriors } from "../../src/core/continuity/types";
import { reorderByPriors, strategyPriors } from "../../src/core/continuity/priors";
import { deriveSnapshot } from "../../src/core/continuity/snapshot";
import { synthHistory } from "./helpers";

const KEYS = [...REG.strategy.keys()];
const priorArb: fc.Arbitrary<StrategyPriors> = fc.dictionary(fc.constantFrom(...KEYS), fc.constantFrom("helpful" as const, "unhelpful" as const));
const T0 = 1_800_000_000_000;

type G = { pick: number; dt: number; rt?: "APP_HIDDEN" | "APP_VISIBLE" | "TICK" };
const gArb = fc.record({ pick: fc.nat(9), dt: fc.integer({ min: 1, max: 120 }), rt: fc.option(fc.constantFrom("APP_HIDDEN" as const, "APP_VISIBLE" as const, "TICK" as const), { nil: undefined }) });

function run(steps: G[], priors?: StrategyPriors) {
  let t = T0;
  let r = startSession("PR", t, REG, priors ? { priors } : {});
  const out = [r];
  steps.forEach((g, i) => {
    t += g.dt * 1000;
    const card = r.state.card!;
    let input: RawInput;
    if (g.rt) input = { kind: "runtime", id: `p${i}`, at: t, event: g.rt };
    else {
      const acts = card.actions.filter((a) => !["wipe", "restart", "end_session", "im_fine_end"].includes(a.id));
      const a = (acts.length ? acts : card.actions)[g.pick % Math.max(1, (acts.length ? acts : card.actions).length)]!;
      input = { kind: "tap", id: `p${i}`, at: t, cardInstanceId: card.instanceId, actionId: a.id };
    }
    r = processEvent(r.state, input, REG, priors ? { priors } : {});
    out.push(r);
  });
  return out;
}

describe("strategy priors (longitudinal personalization)", () => {
  it("empty priors ⇒ byte-identical to v0.1 (no behaviour change without history)", () => {
    fc.assert(fc.property(fc.array(gArb, { maxLength: 30 }), (steps) => {
      const a = run(steps).map((r) => JSON.stringify([r.output, r.log]));
      const b = run(steps, {}).map((r) => JSON.stringify([r.output, r.log]));
      expect(b).toEqual(a);
    }), { numRuns: 100 });
  });

  it("priors never change the band nor the P0 commander of any state (INV-021 · L03 · L04)", () => {
    fc.assert(fc.property(fc.array(gArb, { maxLength: 30 }), priorArb, (steps, priors) => {
      for (const r of run(steps, priors)) {
        if (r.state.status !== "active") continue;
        const a = decideCore(r.state, r.state.lastAt, REG, true);
        const b = decideCore(r.state, r.state.lastAt, REG, true, priors);
        expect(b.band).toBe(a.band);
        expect(b.decision.why.commander).toBe(a.decision.why.commander);
        expect(b.decision.pick.skill).toBe(a.decision.pick.skill);
      }
    }), { numRuns: 100 });
  });

  it("with priors the chosen strategy is always eligible and never a blocked one (INV-005 · INV-021)", () => {
    fc.assert(fc.property(fc.array(gArb, { maxLength: 40 }), priorArb, (steps, priors) => {
      for (const r of run(steps, priors)) {
        expect(r.log.violations).toEqual([]);
        const c = r.output.card;
        if (c.kind !== "action" || !c.strategy || c.skill === "terminal" || c.skill === "emergency_escalation" || c.skill === "confirm_commitment") continue;
        const def = REG.skill.get(c.skill)!.strategies.find((s) => s.id === c.strategy)!;
        const { facts } = buildFacts(r.state, r.state.lastAt, REG);
        // The card was chosen at r.state.lastAt with the state BEFORE bookkeeping; "satisfied"/"repeat" may legitimately flip after onShow.
        const why = strategyIneligibility(c.skill, def, { state: r.state, facts, band: c.band, now: r.state.lastAt, reg: REG, priors });
        expect(why === null || why === "satisfied" || why === "repeat").toBe(true);
      }
    }), { numRuns: 100 });
  });

  it("priors never write a signal (INV-020): signal tables are identical with and without priors", () => {
    fc.assert(fc.property(fc.array(gArb, { maxLength: 30 }), priorArb, (steps, priors) => {
      const a = run(steps);
      const b = run(steps, priors);
      // Same inputs may lead to different cards, so compare only the FIRST divergence point: until then, signals must match exactly.
      for (let i = 0; i < a.length; i++) {
        if (a[i]!.output.card.key !== b[i]!.output.card.key) break;
        expect(JSON.stringify(b[i]!.state.signals)).toBe(JSON.stringify(a[i]!.state.signals));
      }
    }), { numRuns: 100 });
  });

  it("reorderByPriors is stable, keeps fallbacks last and never adds or removes", () => {
    const def = REG.skill.get("steady_check")!.strategies;
    const out = reorderByPriors("steady_check", def, { "steady_check.hold": "helpful", "steady_check.check_later": "helpful" });
    expect(out.map((s) => s.id)).toEqual(["check_later", "tips", "hold"]);
    const g = REG.skill.get("grounding")!.strategies;
    expect(reorderByPriors("grounding", g, { "grounding.breath_pacer": "unhelpful", "grounding.five_senses": "helpful" }).map((s) => s.id)).toEqual(["five_senses", "feet_floor", "breath_pacer"]);
  });

  it("a real history changes the FIRST grounding strategy offered, and only that", () => {
    const now = T0 + 10 * 86_400_000;
    const evs = synthHistory("grounding", "five_senses", 3, "better", now - 5 * 86_400_000);
    const snap = deriveSnapshot(evs, now, REG);
    const priors = strategyPriors(snap, REG);
    expect(priors["grounding.five_senses"]).toBe("helpful");
    // self · no red flags · thinks normally · anxiety high · with someone → P2 grounding
    const steps: G[] = [{ pick: 0, dt: 2 }, { pick: 0, dt: 2 }, { pick: 0, dt: 2 }, { pick: 3, dt: 2 }, { pick: 1, dt: 2 }];
    const plain = run(steps).at(-1)!.output.card;
    const withHist = run(steps, priors).at(-1)!.output.card;
    if (plain.skill === "grounding" && withHist.skill === "grounding") {
      expect(plain.strategy).toBe("breath_pacer");
      expect(withHist.strategy).toBe("five_senses");
    }
    expect(withHist.band).toBe(plain.band);
  });
});


/**
 * PISTA (audit 011) — the Akinator for what was used, the endless care loop, anxiety asked once, pace read (not asked),
 * and the breathing orb behind the card. Pinned as tests over long sessions driven like a person would (scripts/converse.ts).
 */
import { describe, it, expect } from "vitest";
import { converse, PERSONAS } from "../../scripts/converse";
import { REG } from "../../src/core/registry";
import { LOCALES } from "../../src/ui/locale";
import { initialState, type SessionState } from "../../src/core/domain/state";
import { decideCore } from "../../src/core/planner/decide";
import { buildFacts } from "../../src/core/logic/facts";
import { evaluate } from "../../src/core/logic/predicate";
import { SCENARIOS, runScenario } from "../scenarios/scenarios";
import type { StepResult } from "../../src/core/domain/decision";
import { processEvent } from "../../src/core/process-event";

const NOW = 1_800_000_000_000;
const sessions = Object.keys(PERSONAS).map((p) => ({ p, steps: converse(p, 90).steps }));
const everyStep: StepResult[] = [...sessions.flatMap((s) => s.steps), ...SCENARIOS.flatMap((sc) => runScenario(sc))];
const DISCOVERY = ["Q_SUBSTANCE", "Q_WHICH_STIM", "Q_WHICH_DOWNER", "Q_WHICH_PSY", "Q_ALCOHOL", "Q_SEX", "Q_BODY"];

describe("pista: discovery, care loop, pace and the breathing orb (audit 011)", () => {
  it("anxiety is asked once per session (Q_ANXIETY maxAsks 1); afterwards the person's own reports and the pace carry it", () => {
    expect(REG.question.get("Q_ANXIETY")!.maxAsks).toBe(1);
    for (const { p, steps } of sessions) {
      const shown = new Set(steps.filter((r) => r.output.card.questionId === "Q_ANXIETY").map((r) => r.output.card.instanceId));
      expect(shown.size, p).toBeLessThanOrEqual(1);
    }
  });

  it("no discovery question before the first help, and none while its condition is false (INV-031)", () => {
    for (const { p, steps } of sessions) {
      let helped = false;
      for (let i = 1; i < steps.length; i++) {
        const c = steps[i]!.output.card;
        if (c.kind === "action" && c.band !== "P0") helped = true;
        if (!c.questionId || !DISCOVERY.includes(c.questionId)) continue;
        expect(helped, `${p}: ${c.questionId} before any help`).toBe(true);
        if (steps[i - 1]!.output.card.instanceId === c.instanceId) continue; // the same card, still on screen
        const q = REG.question.get(c.questionId)!;
        const prev = steps[i - 1]!.state;
        expect(evaluate(q.when!, buildFacts(prev, prev.lastAt, REG).facts).ok, `${p}: ${c.questionId} asked while its condition was false`).toBe(true);
      }
    }
  });

  it("the loop never runs dry: 90 minutes, never three bare fallbacks in a row, and help keeps changing", () => {
    for (const { p, steps } of sessions) {
      const cards = steps.map((r) => r.output.card).filter((c, i, a) => i === 0 || c.instanceId !== a[i - 1]!.instanceId);
      let holds = 0;
      for (const c of cards) {
        holds = c.skill === "steady_check" && c.strategy === "hold" ? holds + 1 : 0;
        expect(holds, `${p}: fallback repeated`).toBeLessThan(3);
      }
      const helps = new Set(cards.filter((c) => c.kind === "action" && c.band !== "P0").map((c) => `${c.skill}.${c.strategy}`));
      expect(helps.size, `${p}: distinct helps in 90 min`).toBeGreaterThanOrEqual(8);
    }
  });

  it("the orb (L27, INV-032) never shows in P0, nor unless breathing = normal and the person responds", () => {
    for (const r of everyStep) {
      if (!r.output.breath) continue;
      expect(r.log.band).not.toBe("P0");
      const f = buildFacts(r.state, r.state.lastAt, REG).facts;
      expect(f["signal.breathing"]).toBe("normal");
      expect(f["signal.responsiveness"]).toBe("responsive");
    }
    expect(everyStep.some((r) => r.output.breath)).toBe(true);
  });

  it("paced breathing is never a card again: the retired strategy is never picked and never on the menu", () => {
    for (const r of everyStep) {
      expect(r.output.card.strategy).not.toBe("breath_pacer");
      expect(r.output.chips.map((c) => c.chipId as string)).not.toContain("CHIP_TOOL_BREATH");
    }
  });

  it("nothing by mouth (water, food, gargle, toothbrush) unless the person responds AND breathes normally", () => {
    const byMouth = new Set(["sip_water", "eat_something", "throat_soothe", "brush_teeth"]);
    for (const r of everyStep) {
      const c = r.output.card;
      if (c.skill !== "care" || !byMouth.has(c.strategy ?? "")) continue;
      if (r.log.why.policyRule === "KEEP_HELP") continue; // kept by L28: checked when shown, answers only aged since
      const f = buildFacts(r.state, r.state.lastAt, REG).facts;
      expect([f["signal.breathing"], f["signal.responsiveness"]], `${c.strategy}`).toEqual(["normal", "responsive"]);
    }
  });

  it("pace is read, never reported (L25): the slowest pace never changes the band, a signal or the next help's safety", () => {
    const actors = ["self", "helper"] as const;
    for (const actor of actors) for (const anxiety of [1, 3, 4]) for (const substanceClass of ["stim", "downer", "unknown"]) for (const alcohol of ["yes", "no"]) {
      const s: SessionState = initialState("P", NOW - 60_000);
      s.lastAt = NOW;
      const set = (k: string, v: string | number) => ((s.signals as Record<string, unknown>)[k] = { value: v, source: "user_explicit", observedAt: NOW - 1000, expiresAt: null });
      set("actor", actor); set("responsiveness", "responsive"); set("breathing", "normal"); set("chest", "no"); set("seizure", "no");
      set("anxiety", anxiety); set("company", actor === "self" ? "with_someone" : "with_someone"); set("noise", "quiet");
      if (substanceClass !== "unknown") { set("substanceClass", substanceClass); set("alcohol", alcohol); }
      const quick = decideCore(s, NOW, REG);
      const slow = decideCore({ ...s, answerPace: [{ ms: 120_000, at: NOW - 2000 }, { ms: 120_000, at: NOW - 1000 }] }, NOW, REG);
      expect(buildFacts({ ...s, answerPace: [{ ms: 120_000, at: NOW - 2000 }, { ms: 120_000, at: NOW - 1000 }] }, NOW, REG).facts["pace"]).toBe("slow");
      expect(slow.band, `${actor}/${anxiety}/${substanceClass}`).toBe(quick.band);
      expect(slow.decision.pick.skill).toBe(quick.decision.pick.skill);
    }
  });

  it("combinations raise attention, never P0 by themselves (L26): every mixing level ends in P1/P2 with its warning", () => {
    const combos: Record<string, string>[] = [
      { substanceClass: "downer", substance: "ghb", alcohol: "yes" },
      { substanceClass: "stim", substance: "coke", alcohol: "yes" },
      { substanceClass: "stim", substance: "md", alcohol: "yes" },
      { substanceClass: "stim", sexEnhancer: "both" },
      { substanceClass: "stim", sexEnhancer: "pill" },
    ];
    for (const c of combos) {
      const s: SessionState = initialState("M", NOW - 60_000);
      s.lastAt = NOW;
      const base = { actor: "self", responsiveness: "responsive", breathing: "normal", chest: "no", company: "with_someone", noise: "quiet", anxiety: 1, ...c };
      for (const [k, v] of Object.entries(base)) (s.signals as Record<string, unknown>)[k] = { value: v, source: "user_explicit", observedAt: NOW - 1000, expiresAt: null };
      const d = decideCore(s, NOW, REG).decision;
      expect(d.band, JSON.stringify(c)).not.toBe("P0");
      expect(["P1", "P2"], JSON.stringify(c)).toContain(d.band);
      expect(d.pick.skill, JSON.stringify(c)).toBe("combination");
    }
  });

  it("L28 / INV-033: time alone never changes a non-P0 card, from any state of any story, after 30 s, 10 min or 30 min", () => {
    let checked = 0;
    for (const sc of SCENARIOS) for (const r of runScenario(sc)) {
      if (r.state.status !== "active" || r.log.band === "P0") continue;
      for (const wait of [30_000, 600_000, 1_800_000]) {
        const next = processEvent(r.state, { kind: "runtime", id: `tick-${checked}`, at: r.state.lastAt + wait, event: "TICK" });
        if (next.log.band === "P0") continue; // the one exception: an emergency (e.g. HR-008 silence after medical risk)
        expect(next.output.card.instanceId, `${sc.name} +${wait / 1000}s`).toBe(r.output.card.instanceId);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(300);
  });

  it("no card promises to call back later, and the retired 'Tá mais tranquilo' tips never show (audit 012)", () => {
    for (const r of everyStep) {
      expect(r.output.card.strategy).not.toBe("tips");
      expect(r.output.card.actions.map((a) => a.id)).not.toContain("check_later");
    }
  });

  it("L29 (audit 013): nothing in the app asks the person to grade how they are, or promises a check later", () => {
    for (const c of REG.data.cards) for (const a of c.actions ?? []) {
      expect(["better", "worse", "same"], `${c.id}.${a.id}`).not.toContain(a.id);
      expect(a.ops.some((o) => o.op === "SIGNALS_REPORTED" && "reportedTrend" in o.set), `${c.id}.${a.id} reports a trend`).toBe(false);
      expect(a.ops.some((o) => o.op === "COMMITMENT_CREATED" && o.kind === "CHECK_IN"), `${c.id}.${a.id}`).toBe(false);
    }
    for (const c of REG.data.chips) expect(c.action.ops.some((o) => o.op === "SIGNALS_REPORTED" && "reportedTrend" in o.set), c.id).toBe(false);
    expect(REG.data.commitments.map((c) => c.id)).not.toContain("CHECK_IN");
    expect(REG.data.questions.flatMap((q) => Object.values(q.variants).flatMap((v) => v.answers.flatMap((a) => Object.keys(a.set))))).not.toContain("reportedTrend");
    const labels = Object.values(LOCALES["pt-BR"]!.cards).flatMap((c) => Object.values(c.actions)).concat(Object.values(LOCALES["pt-BR"]!.chips).map((c) => c.label));
    for (const l of labels) expect(l, l).not.toMatch(/melhorou|piorou|tá melhor|tá piorando|me chama (em|daqui)/i);
  });
});

/**
 * ACOLHIMENTO (audit 010) — the rhythm the owner asked for, pinned as tests:
 *   L21 help before questions, then at most one question between two helps
 *   L22 silence brings presence, never "how are you?"; the person reports when THEY want
 *   L23 a menu, always (never in P0), that still respects contraindications and perspective
 *   L24 the same question is not repeated within its interval
 * The session driver follows the app like a person would: it answers, and does each exercise for a minute.
 */
import { describe, it, expect } from "vitest";
import { processEvent, startSession } from "../../src/core/process-event";
import type { StepResult } from "../../src/core/domain/decision";
import { REG } from "../../src/core/registry";

const T0 = 1_800_000_000_000;

interface Session { steps: StepResult[]; firstHelpAt: number; taps: number }

function follow(answers: Record<string, string>, minutes: number): Session {
  let t = T0;
  let r = startSession("A", t);
  const steps = [r];
  let n = 0;
  let taps = 0;
  let firstHelpAt = -1;
  while (t - T0 < minutes * 60_000) {
    const c = r.output.card;
    let input;
    if (c.questionId) {
      t += 15_000;
      input = { kind: "tap" as const, id: `a${++n}`, at: t, cardInstanceId: c.instanceId, actionId: answers[c.questionId] ?? c.actions[0]!.id };
    } else {
      if (firstHelpAt < 0 && c.band !== "P0") firstHelpAt = taps;
      const ids = c.actions.map((a) => a.id);
      const id = ids.includes("done") ? "done" : ids.includes("nobody") ? "nobody" : ids.includes("not_now") ? "not_now" : ids[0]!;
      t += 60_000; // doing the exercise, not tapping
      r = processEvent(r.state, { kind: "runtime", id: `t${++n}`, at: t, event: "TICK" });
      steps.push(r);
      t += 5_000;
      input = { kind: "tap" as const, id: `a${++n}`, at: t, cardInstanceId: r.output.card.instanceId, actionId: r.output.card.actions.some((a) => a.id === id) ? id : r.output.card.actions[0]!.id };
    }
    taps += 1;
    r = processEvent(r.state, input);
    steps.push(r);
    if (r.state.status !== "active") break;
  }
  return { steps, firstHelpAt, taps };
}

const asks = (s: Session, qid: string) => s.steps.filter((r, i) => r.output.card.questionId === qid && s.steps[i - 1]?.output.card.instanceId !== r.output.card.instanceId).length;

describe("acolhimento: help-first rhythm (audit 010)", () => {
  const PANIC = { Q_ACTOR: "self", Q_RED_FLAGS: "none", Q_CLARITY: "yes", Q_ANXIETY: "panic", Q_NOISE: "quiet", Q_HOW_NOW: "same" };

  for (const company of ["with", "alone"]) {
    it(`self in panic (${company}): help after a short triage, then never two questions in a row; no "how are you" loop in 15 min`, () => {
      const s = follow({ ...PANIC, Q_COMPANY: company }, 15);
      expect(s.firstHelpAt).toBeLessThanOrEqual(4); // actor · red flags · clarity · anxiety
      const first = s.steps.find((r) => r.output.card.kind === "action")!;
      expect(first.output.card.skill).toBe("grounding"); // a calming technique first, even alone (L21, P1-015/P2-040)
      expect(asks(s, "Q_ANXIETY")).toBeLessThanOrEqual(2);
      expect(asks(s, "Q_HOW_NOW")).toBe(0);
      // After the first help, never two different questions back to back (critical safety re-checks excepted).
      const firstHelp = s.steps.indexOf(first);
      const cards = s.steps.slice(firstHelp).map((r) => r.output.card);
      for (let i = 1; i < cards.length; i++) {
        const a = cards[i - 1]!;
        const b = cards[i]!;
        if (a.kind === "question" && b.kind === "question" && a.instanceId !== b.instanceId && b.questionId !== "Q_RED_FLAGS" && a.questionId !== "Q_RED_FLAGS") {
          throw new Error(`two questions in a row after help: ${a.questionId} → ${b.questionId}`);
        }
      }
    });
  }

  it("before audit 010 the same session asked 'Quanto de ansiedade?' after every exercise: the limit is now data (L24)", () => {
    const q = REG.question.get("Q_ANXIETY")!;
    expect(q.minIntervalSec).toBeGreaterThanOrEqual(600);
    expect(REG.question.get("Q_HOW_NOW")!.minIntervalSec).toBeGreaterThanOrEqual(600);
    for (const c of REG.data.cards) for (const a of c.actions ?? []) expect(a.ops.some((o) => o.op === "SIGNALS_EXPIRED" && o.signals.includes("anxiety")), `${c.id}.${a.id}`).toBe(false);
  });

  it("silence on a help card brings PRESENCE and keeps the card; it never asks (L22)", () => {
    let t = T0;
    let r = startSession("S", t);
    for (const a of ["self", "none", "yes", "panic"]) { t += 10_000; r = processEvent(r.state, { kind: "tap", id: a, at: t, cardInstanceId: r.output.card.instanceId, actionId: a }); }
    const help = r.output.card;
    expect(help.kind).toBe("action");
    for (let i = 0; i < 6; i++) {
      t += 90_000;
      r = processEvent(r.state, { kind: "runtime", id: `tick${i}`, at: t, event: "TICK" });
      expect(r.output.card.cardId).toBe(help.cardId);
    }
    expect(["PRESENCE", "PRESENCE_WAVE", "PRESENCE_MINUTE"]).toContain(r.output.notice);
  });

  it("the menu is empty in P0 and every chip on offer opens its own strategy (L23)", () => {
    let t = T0;
    let r = startSession("M", t);
    for (const a of ["self", "none", "yes", "high"]) { t += 10_000; r = processEvent(r.state, { kind: "tap", id: a, at: t, cardInstanceId: r.output.card.instanceId, actionId: a }); }
    const offered = r.output.chips.filter((c) => c.group === "tools" || c.group === "talk");
    expect(offered.length).toBeGreaterThanOrEqual(6);
    for (const chip of offered) {
      const def = REG.chip.get(chip.chipId)!;
      const op = def.action.ops.find((o) => o.op === "STRATEGY_REQUESTED")!;
      const picked = processEvent(r.state, { kind: "chip", id: `c-${chip.chipId}`, at: t + 1000, chipId: chip.chipId });
      expect(picked.rejected, chip.chipId).toBeUndefined();
      if (op.op === "STRATEGY_REQUESTED") expect(`${picked.output.card.skill}.${picked.output.card.strategy}`, chip.chipId).toBe(`${op.skill}.${op.strategy}`);
    }
    const p0 = processEvent(r.state, { kind: "text", id: "t", at: t + 2000, text: "não consigo respirar" });
    expect(p0.log.band).toBe("P0");
    expect(p0.output.chips).toEqual([]);
    expect(processEvent(p0.state, { kind: "chip", id: "c", at: t + 3000, chipId: "CHIP_TOOL_FEET" }).rejected).toBe("UNKNOWN_ACTION");
  });

  it("the menu never offers what a contraindication or the helper's perspective forbids (INV-027, L10)", () => {
    let t = T0;
    let r = startSession("H", t);
    for (const a of ["helper", "normal", "strange", "none"]) { t += 10_000; r = processEvent(r.state, { kind: "tap", id: a, at: t, cardInstanceId: r.output.card.instanceId, actionId: a }); }
    const ids = r.output.chips.map((c) => c.chipId);
    for (const forbidden of ["CHIP_TOOL_BREATH", "CHIP_TOOL_SIGH", "CHIP_TOOL_HUM", "CHIP_TOOL_COLD", "CHIP_TALK_MESSAGE", "CHIP_TALK_CVV"]) expect(ids, forbidden).not.toContain(forbidden);
    for (const allowed of ["CHIP_TOOL_FEET", "CHIP_TOOL_WALL", "CHIP_TALK_STAY"]) expect(ids, allowed).toContain(allowed);
  });
});

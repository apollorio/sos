/** L10 + INV-027 — fast guard: helpers get helper-addressed copy; grounding respects physiology. */
import { describe, it, expect } from "vitest";
import { REG } from "../../src/core/registry";
import { initialState, type SessionState } from "../../src/core/domain/state";
import { decideCore } from "../../src/core/planner/decide";
import { buildFacts } from "../../src/core/logic/facts";
import { SKILLS } from "../../src/core/skills";
import { LOCALES, pickText } from "../../src/ui/locale";
import type { Primitive } from "../../src/core/domain/signals";
import { helperPerspectiveViolation } from "./perspective";

const NOW = 1_800_000_000_000;
const loc = LOCALES["pt-BR"]!;

function state(signals: Record<string, Primitive>): SessionState {
  const s = initialState("P", NOW - 60_000);
  s.lastAt = NOW;
  for (const [k, v] of Object.entries(signals)) {
    (s.signals as Record<string, unknown>)[k] = { value: v, source: "user_explicit", observedAt: NOW - 1000, expiresAt: null };
    if (k === "anxiety" && typeof v === "number") s.anxietyHistory = [{ value: v, at: NOW - 1000 }];
  }
  return s;
}
const body = (cardId: string, keys: string[]) => pickText(loc.cards[cardId]!.body as never, keys);
const title = (cardId: string, keys: string[]) => pickText(loc.cards[cardId]!.title as never, keys);

describe("actor perspective (L10)", () => {
  it("helper + abnormal breathing + anxious → feet_floor addressed to the helper, never the breath pacer (INV-027)", () => {
    const d = decideCore(state({ actor: "helper", company: "with_someone", responsiveness: "responsive", breathing: "abnormal", seizure: "no", chest: "no", anxiety: 3, noise: "quiet" }), NOW, REG).decision;
    expect(`${d.pick.skill}.${d.pick.strategy}`).toBe("grounding.feet_floor");
    expect(body(d.pick.cardId, d.pick.variantKeys)).toMatch(/^Ajude a pessoa/);
  });

  it("helper + loud → relocate tells the helper to take the person", () => {
    const d = decideCore(state({ actor: "helper", company: "with_someone", responsiveness: "responsive", breathing: "normal", seizure: "no", chest: "no", anxiety: 3, noise: "loud" }), NOW, REG).decision;
    expect(`${d.pick.skill}.${d.pick.strategy}`).toBe("reduce_stimulation.relocate");
    expect(body(d.pick.cardId, d.pick.variantKeys)).toMatch(/^Leve a pessoa/);
  });

  it("helper in P3 with a reported stimulant → tips about the person (substance.actor key wins)", () => {
    const d = decideCore(state({ actor: "helper", company: "with_someone", responsiveness: "responsive", breathing: "normal", seizure: "no", chest: "no", anxiety: 1, noise: "quiet", substanceClass: "stim" }), NOW, REG).decision;
    expect(`${d.pick.skill}.${d.pick.strategy}`).toBe("steady_check.tips");
    expect(d.pick.variantKeys[0]).toBe("stim.helper");
    expect(body(d.pick.cardId, d.pick.variantKeys)).toMatch(/^Ajude a pessoa/);
    const self = decideCore(state({ actor: "self", company: "with_someone", responsiveness: "responsive", breathing: "normal", chest: "no", anxiety: 1, noise: "quiet", substanceClass: "stim" }), NOW, REG).decision;
    expect(body(self.pick.cardId, self.pick.variantKeys)).toBe(pickText(loc.cards["CARD_STEADY_TIPS"]!.body as never, ["stim"]));
  });

  it("the substance question asks a helper about the person", () => {
    const s = state({ actor: "helper", company: "with_someone" });
    const pick = SKILLS.assess.select({ state: s, facts: buildFacts(s, NOW, REG).facts, band: "P3", now: NOW, reg: REG, questionId: "Q_SUBSTANCE" })!;
    expect(title(pick.cardId, pick.variantKeys)).toBe("Como bateu no corpo da pessoa?");
  });

  it("sweep: every non-P0 card a helper can reach resolves to helper copy or is declared actor-neutral", () => {
    const bad = new Set<string>();
    let n = 0;
    for (const responsiveness of ["responsive", "impaired"]) for (const breathing of ["normal", "abnormal"]) for (const anxiety of [1, 3, 4])
      for (const noise of ["quiet", "moderate", "loud"]) for (const companion of ["none", "coming", "arrived"]) for (const substanceClass of ["none", "stim", "downer", "psychedelic"])
        for (const reportedTrend of ["better", "same", "worse"]) {
          const d = decideCore(state({ actor: "helper", company: "with_someone", seizure: "no", chest: "no", responsiveness, breathing, anxiety, noise, companion, substanceClass, reportedTrend }), NOW, REG).decision;
          const v = helperPerspectiveViolation(d.pick, d.band);
          if (v) bad.add(v);
          n++;
        }
    expect(n).toBe(2 * 2 * 3 * 3 * 3 * 4 * 3);
    expect([...bad]).toEqual([]);
  });

  it("grounding physiology over the same sweep: no breath pacer unless breathing=normal ∧ responsive; no five_senses unless responsive", () => {
    for (const actor of ["self", "helper"]) for (const responsiveness of ["responsive", "impaired"]) for (const breathing of ["normal", "abnormal"]) for (const anxiety of [3, 4]) {
      const s = state({ actor, company: "with_someone", responsiveness, breathing, anxiety, noise: "quiet", chest: "no", seizure: "no" });
      for (const strategy of ["breath_pacer", "feet_floor", "five_senses"]) {
        // exhaust earlier grounding strategies so each one is examined in isolation
        const order = ["breath_pacer", "feet_floor", "five_senses"];
        for (const other of order.slice(0, order.indexOf(strategy))) s.strategies[`grounding.${other}`] = { doneAt: null, blockedUntil: NOW + 1e6, shows: 1 };
        const pick = SKILLS.grounding.select({ state: s, facts: buildFacts(s, NOW, REG).facts, band: "P2", now: NOW, reg: REG });
        if (pick?.strategy === "breath_pacer") expect({ breathing, responsiveness }).toEqual({ breathing: "normal", responsiveness: "responsive" });
        if (pick?.strategy === "five_senses") expect(responsiveness).toBe("responsive");
      }
    }
  });
});

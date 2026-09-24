import { describe, it, expect } from "vitest";
import { lintRegistry } from "../../scripts/registry-lint";
import { buildReg, REG } from "../../src/core/registry";
import type { RegistryData } from "../../src/core/registry/types";

const mutate = (f: (d: RegistryData) => void) => {
  const d = structuredClone(REG.data);
  f(d);
  return lintRegistry({ reg: buildReg(d) }).errors;
};

describe("registry lint", () => {
  it("the shipped registry has zero errors", () => {
    expect(lintRegistry().errors).toEqual([]);
  });
  it("release mode blocks unreviewed clinical copy", () => {
    expect(lintRegistry({ release: true }).errors.length).toBeGreaterThan(0);
  });
  // Mutation tests: the linter must catch each class of mistake.
  const cases: [string, (d: RegistryData) => void, RegExp][] = [
    ["unknown fact path", (d) => { d.hardRules[0]!.when = { eq: ["signal.nope", "x"] }; }, /unknown fact path/],
    ["literal outside domain", (d) => { d.hardRules[0]!.when = { eq: ["signal.breathing", "fine"] }; }, /∉ domain/],
    ["numeric op on enum", (d) => { d.bandRules[0]!.when = { gte: ["signal.noise", 2] }; }, /numeric comparison/],
    ["non-total policy table", (d) => { d.policies["P2"]!.pop(); }, /INV-018/],
    ["card over action budget", (d) => { d.cards.find((c) => c.id === "CARD_P0_BYSTANDER")!.actions!.push({ id: "x", emphasis: "secondary", ops: [] }); }, /maxActions/],
    ["unknown strategy in op", (d) => { d.cards.find((c) => c.id === "CARD_RELOCATE")!.actions![0]!.ops.push({ op: "STRATEGY_OUTCOME", skill: "grounding", strategy: "yoga", outcome: "done" }); }, /unknown strategy/],
    ["text trigger sets substance", (d) => { d.textTriggers.rules[0]!.set = { substanceClass: "stim" }; }, /INV-012/],
    ["question without 'Não sei'", (d) => { d.questions.find((q) => q.id === "Q_NOISE")!.variants["any"]!.answers.pop(); }, /Não sei/],
    ["bad id pattern", (d) => { d.hardRules[0]!.id = "HR-1"; }, /violates/],
    ["hard rules out of order", (d) => { d.hardRules.reverse(); }, /ascending/],
    ["emergency skill in policy", (d) => { d.policies["P1"]!.unshift({ id: "P1-000", when: { always: true }, skill: "emergency_escalation" }); }, /reserved|not allowed/],
  ];
  for (const [name, f, re] of cases) {
    it(`catches: ${name}`, () => {
      expect(mutate(f).join("\n")).toMatch(re);
    });
  }
});

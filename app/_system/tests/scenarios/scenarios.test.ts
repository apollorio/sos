import { describe, it, expect } from "vitest";
import { SCENARIOS, runScenario } from "./scenarios";

describe("golden scenarios (executable spec of the brainstorm stories)", () => {
  for (const sc of SCENARIOS) {
    it(`${sc.name} — ${sc.doc}`, () => {
      const steps = runScenario(sc);
      const failures = steps.flatMap((s, i) => s.failures.map((f) => `step ${i} (${s.label}): ${f}`));
      expect(failures).toEqual([]);
      for (const s of steps) expect(s.log.violations).toEqual([]);
    });
  }
});

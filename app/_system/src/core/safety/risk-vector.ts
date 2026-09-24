/**
 * Risk vector: ordinal 0..4 per dimension, level = MAX of matching registry rows.
 * No weights, no utilities, no decimals (the brainstorm's own verdict: fake precision).
 */
import type { Reg } from "../registry";
import { evaluate, type Facts } from "../logic/predicate";

export type RiskVector = Record<string, number>;

export function computeRisk(facts: Facts, reg: Reg): RiskVector {
  const risk: RiskVector = Object.fromEntries(reg.data.risk.dimensions.map((d) => [d, 0]));
  for (const row of reg.data.risk.rules) {
    if ((risk[row.dimension] ?? 0) >= row.level) continue;
    if (evaluate(row.when, facts).ok) risk[row.dimension] = row.level;
  }
  return risk;
}

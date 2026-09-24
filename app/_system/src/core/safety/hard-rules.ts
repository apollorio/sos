/**
 * HARD RULES — ordered list, FIRST MATCH WINS. No merging of P0s (L04).
 * All matching rules are still reported (for the log), but exactly one commands.
 * Latch: once P0 was entered through a latching rule, P0 persists even if the fact
 * later reads differently — only CORRECTION / session end release it (L03).
 */
import type { Reg } from "../registry";
import type { SessionState } from "../domain/state";
import type { HardRuleDef } from "../registry/types";
import { evaluate, type Facts, type TraceLeaf } from "../logic/predicate";

export interface Commander {
  rule: HardRuleDef;
  because: TraceLeaf[];
  alsoMatching: string[];
  latchedOnly: boolean;
}

export function evaluateHardRules(state: SessionState, facts: Facts, reg: Reg): Commander | null {
  let first: { rule: HardRuleDef; because: TraceLeaf[] } | null = null;
  const alsoMatching: string[] = [];
  for (const rule of reg.data.hardRules) {
    const r = evaluate(rule.when, facts);
    if (!r.ok) continue;
    if (!first) first = { rule, because: r.because };
    else alsoMatching.push(rule.id);
  }
  if (first) return { ...first, alsoMatching, latchedOnly: false };
  if (state.p0?.latch) {
    const rule = reg.hardRule.get(state.p0.ruleId);
    if (rule) return { rule, because: [{ path: "p0.latch", op: "latched", expected: null, actual: state.p0.ruleId }], alsoMatching, latchedOnly: true };
  }
  return null;
}

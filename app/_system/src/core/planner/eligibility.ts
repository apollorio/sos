/**
 * Strategy eligibility — pure, data-driven. The order of checks is the order of the log.
 */
import type { StrategyDef } from "../registry/types";
import type { SkillCtx } from "../skills/skill";
import { evaluate, type Pred } from "../logic/predicate";

export type Ineligible =
  | "band"
  | "when"
  | `requires:${string}`
  | "blocked"
  | "satisfied"
  | "repeat";

/**
 * `requested`: the person picked this technique from the menu (L23). Their choice lifts the
 * "already done recently" and "shown too often" checks, never a contraindication, a perspective rule or a block.
 */
export function strategyIneligibility(skillId: string, st: StrategyDef, ctx: SkillCtx, requested = false): Ineligible | null {
  if (st.alwaysEligible) return null;
  if (st.bandsOnly && !st.bandsOnly.includes(ctx.band)) return "band";
  if (!evaluate(st.when, ctx.facts).ok) return "when";
  for (const req of st.requires) {
    const pred: Pred | undefined = ctx.reg.requirement.get(req);
    if (!pred || !evaluate(pred, ctx.facts).ok) return `requires:${req}`;
  }
  const key = `${skillId}.${st.id}`;
  const mem = ctx.state.strategies[key];
  if (mem?.blockedUntil != null && mem.blockedUntil > ctx.now) return "blocked";
  if (requested) return null;
  if (mem?.doneAt != null && ctx.now < mem.doneAt + st.cooldownSec * 1000) return "satisfied";
  if (!st.repeatable && ctx.state.repeat.key === key && ctx.state.repeat.count >= 3 && ctx.state.card?.strategy !== st.id) return "repeat";
  return null;
}

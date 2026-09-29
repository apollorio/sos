/**
 * Generic strategy-driven skill: walks the registry strategies in order and returns the first
 * eligible one. 4 of the 7 skills are pure data + this function (zero bespoke code).
 */
import type { SkillId, CardId } from "../../generated/registry.gen";
import type { Skill, SkillCtx } from "./skill";
import { strategyIneligibility } from "../planner/eligibility";
import { variantKeysFor } from "./variants";
import { reorderByPriors } from "../continuity/priors";
import { evaluate } from "../logic/predicate";

export function strategySkill(id: SkillId): Skill {
  return {
    id,
    select(ctx: SkillCtx) {
      const def = ctx.reg.skill.get(id);
      if (!def) throw new Error(`skill ${id} missing from registry`);
      const all = def.strategies.filter((st) => strategyIneligibility(id, st, ctx) === null);
      // L25: simpler things first when the person is slow to answer. A stable partition: nothing is excluded.
      const deferred = (st: (typeof all)[number]) => !!st.deferWhen && evaluate(st.deferWhen, ctx.facts).ok;
      let eligible = [...all.filter((st) => !deferred(st)), ...all.filter(deferred)];
      // Rotation: every technique gets its turn before one repeats (stable: registry order breaks ties).
      if (def.rotate) {
        const shows = (st: (typeof all)[number]) => ctx.state.strategies[`${id}.${st.id}`]?.shows ?? 0;
        const first = eligible.filter((st) => st.keepFirst);
        const rest = eligible.filter((st) => !st.keepFirst).map((st, i) => ({ st, i })).sort((a, b) => shows(a.st) - shows(b.st) || a.i - b.i).map((x) => x.st);
        eligible = [...first, ...rest];
      }
      // Eligibility first, history second: a prior can never enable a strategy, only reorder (L14, INV-021).
      const ordered = ctx.priors ? reorderByPriors(id, eligible, ctx.priors) : eligible;
      for (const st of ordered) {
        return {
          skill: id,
          strategy: st.id,
          cardId: st.card as CardId,
          variantKeys: variantKeysFor(ctx.reg.card.get(st.card), ctx),
          onShow: st.onShow,
          ...(st.interactive ? { interactive: st.interactive } : {}),
        };
      }
      return null;
    },
  };
}

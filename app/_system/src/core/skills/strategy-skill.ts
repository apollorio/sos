/**
 * Generic strategy-driven skill: walks the registry strategies in order and returns the first
 * eligible one. 4 of the 7 skills are pure data + this function (zero bespoke code).
 */
import type { SkillId, CardId } from "../../generated/registry.gen";
import type { Skill, SkillCtx } from "./skill";
import { strategyIneligibility } from "../planner/eligibility";
import { variantKeysFor } from "./variants";

export function strategySkill(id: SkillId): Skill {
  return {
    id,
    select(ctx: SkillCtx) {
      const def = ctx.reg.skill.get(id);
      if (!def) throw new Error(`skill ${id} missing from registry`);
      for (const st of def.strategies) {
        if (strategyIneligibility(id, st, ctx) !== null) continue;
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

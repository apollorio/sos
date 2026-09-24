/**
 * ASSESS — one generic assessment skill. WHICH question is decided by the VOI engine
 * (planner/voi.ts) or pinned by a policy rule. There is no questionnaire and no flow.
 */
import type { Skill } from "../skill";
import type { CardId, QuestionId } from "../../../generated/registry.gen";
import { variantFor } from "../../planner/voi";

export const assess: Skill = {
  id: "assess",
  select(ctx) {
    if (!ctx.questionId) return null;
    const q = ctx.reg.question.get(ctx.questionId);
    if (!q) return null;
    const variant = variantFor(q, ctx.facts);
    if (!variant) return null;
    const actor = String(ctx.facts["signal.actor"]);
    return {
      skill: "assess",
      strategy: null,
      cardId: variant.card as CardId,
      questionId: q.id as QuestionId,
      variantKeys: [actor, "default"],
      onShow: [],
    };
  },
};

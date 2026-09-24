/**
 * CONFIRM_COMMITMENT (generalizes 'confirm_arrival') — the runtime did not forget João.
 * Picks the earliest DUE commitment and shows its own confirmation card.
 */
import type { Skill } from "../skill";
import type { CardId } from "../../../generated/registry.gen";
import { dueCommitments } from "../../state/commitments";
import { variantKeysFor } from "../variants";

export const confirmCommitment: Skill = {
  id: "confirm_commitment",
  select(ctx) {
    const c = dueCommitments(ctx.state, ctx.now)[0];
    if (!c) return null;
    const def = ctx.reg.commitment.get(c.kind);
    if (!def) return null;
    return {
      skill: "confirm_commitment",
      strategy: c.kind.toLowerCase(),
      cardId: def.confirmCard as CardId,
      commitmentId: c.id,
      variantKeys: variantKeysFor(ctx.reg.card.get(def.confirmCard), ctx),
      onShow: [],
    };
  },
};

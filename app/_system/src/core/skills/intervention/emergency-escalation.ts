/**
 * EMERGENCY_ESCALATION — the only P0 skill (INV-001). It never asks anything first (INV-017).
 * Phase is DERIVED from state, never chosen:
 *   handover   help is on scene
 *   bystander  the screen stayed visible with no response (L06: silence changes the audience, not the diagnosis)
 *   waiting    the user tapped/reported the call → guidance while help comes
 *   call       default → tel:192 is the hero action
 */
import type { Skill } from "../skill";
import type { CardId } from "../../../generated/registry.gen";
import { variantKeysFor } from "../variants";

export type P0Phase = "call" | "waiting" | "bystander" | "handover";

export function p0Phase(flags: { helpOnScene: boolean; emergencyEngaged: boolean }, silenceCount: number): P0Phase {
  if (flags.helpOnScene) return "handover";
  if (silenceCount >= 1) return "bystander";
  if (flags.emergencyEngaged) return "waiting";
  return "call";
}

export const emergencyEscalation: Skill = {
  id: "emergency_escalation",
  select(ctx) {
    const reason = ctx.commander?.rule.reason ?? "user_initiated";
    const def = ctx.reg.skill.get("emergency_escalation");
    const phase = p0Phase(ctx.state.flags, ctx.state.silence.count);
    const table = def?.phases?.[phase];
    const cardId = (table?.[reason] ?? table?.["default"]) as CardId | undefined;
    if (!cardId) throw new Error(`emergency_escalation: no card for phase ${phase}`);
    return {
      skill: "emergency_escalation",
      strategy: phase,
      cardId,
      variantKeys: variantKeysFor(ctx.reg.card.get(cardId), ctx, reason),
      onShow: [],
    };
  },
};

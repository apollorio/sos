import type { CardDef } from "../registry/types";
import type { SkillCtx } from "./skill";

/** Most-specific-first locale keys. The UI falls back down the list; "default" always exists (lint). */
export function variantKeysFor(card: CardDef | undefined, ctx: SkillCtx, reason?: string): string[] {
  const actor = String(ctx.facts["signal.actor"] ?? "unknown");
  const keys: string[] = [];
  const vk = card?.variantKeys ?? [];
  if (reason) keys.push(`${reason}.${actor}`, reason);
  if (vk.includes("substance")) {
    const sub = String(ctx.facts["signal.substanceClass"]);
    keys.push(`${sub}.${actor}`, sub); // perspective first: a helper never gets tips addressed to the person in crisis (L10)
  }
  if (vk.includes("engaged") && ctx.state.flags.emergencyEngaged) keys.push("engaged");
  keys.push(actor, "default");
  return [...new Set(keys)];
}

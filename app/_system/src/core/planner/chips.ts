/**
 * CHIPS — what sits beside the card (L23: "a way out and a menu, always").
 *   pending  shown while a commitment is pending (e.g. "Chegou alguém? Toque aqui")
 *   tools    a calming technique the person can pick at any time
 *   talk     a person to reach (message someone, CVV 188) the person can pick at any time
 *   report   "how I am" (better / worse), said when THEY want, never asked again and again (L22)
 * A tools/talk chip is offered only while its strategy is eligible: contraindications, perspective (L10) and
 * "Não tenho …" blocks still apply to the menu. Nothing is offered in P0: the emergency card commands alone.
 * Pure: same inputs, same chips.
 */
import type { Reg } from "../registry";
import type { ChipDef, StrategyDef } from "../registry/types";
import type { SessionState } from "../domain/state";
import type { ChipView, SkillPick } from "../domain/decision";
import type { Band, CardId, ChipId } from "../../generated/registry.gen";
import type { Facts } from "../logic/predicate";
import { strategyIneligibility } from "./eligibility";
import { variantKeysFor } from "../skills/variants";

/** How long a pick from the menu stays in force if the person does nothing with it. */
export const REQUEST_TTL_MS = 10 * 60_000;

export function requestOf(chip: ChipDef): { skill: string; strategy: string } | null {
  const op = chip.action.ops.find((o) => o.op === "STRATEGY_REQUESTED");
  return op && op.op === "STRATEGY_REQUESTED" ? { skill: op.skill, strategy: op.strategy } : null;
}

function strategyDef(reg: Reg, skill: string, strategy: string): StrategyDef | undefined {
  return reg.strategy.get(`${skill}.${strategy}`);
}

/** Could the person pick this strategy right now? Safety and perspective rules hold; "done recently" does not. */
export function requestable(skill: string, strategy: string, state: SessionState, facts: Facts, band: Band, now: number, reg: Reg): boolean {
  if (band === "P0") return false;
  const st = strategyDef(reg, skill, strategy);
  if (!st) return false;
  return strategyIneligibility(skill, st, { state, facts, band, now, reg }, true) === null;
}

export function chipAvailable(chip: ChipDef, state: SessionState, facts: Facts, band: Band | null, now: number, reg: Reg): boolean {
  if (!band || band === "P0" || !chip.bands.includes(band)) return false;
  if (chip.whenPending && !state.commitments.some((c) => c.kind === chip.whenPending && c.status === "pending")) return false;
  // "How I am" only makes sense once some help has been on screen.
  if (chip.group === "report" && !Object.values(state.strategies).some((m) => m.shows > 0)) return false;
  const req = requestOf(chip);
  if (req) {
    if (state.card?.skill === req.skill && state.card.strategy === req.strategy) return false; // already on screen
    return requestable(req.skill, req.strategy, state, facts, band, now, reg);
  }
  return true;
}

export function chipsFor(state: SessionState, facts: Facts, band: Band, now: number, reg: Reg): ChipView[] {
  const order: ChipDef["group"][] = ["pending", "tools", "talk", "report"];
  return order.flatMap((g) => reg.data.chips
    .filter((c) => c.group === g && chipAvailable(c, state, facts, band, now, reg))
    .map((c) => ({ chipId: c.id as ChipId, actionId: c.action.id, group: c.group })));
}

/** The technique the person picked, if it is still fresh and still safe to show. */
export function requestedPick(state: SessionState, facts: Facts, band: Band, now: number, reg: Reg): SkillPick | null {
  const r = state.requested;
  if (!r || now - r.at > REQUEST_TTL_MS) return null;
  const dot = r.key.indexOf(".");
  const skill = r.key.slice(0, dot);
  const strategy = r.key.slice(dot + 1);
  const st = strategyDef(reg, skill, strategy);
  if (!st || !requestable(skill, strategy, state, facts, band, now, reg)) return null;
  return {
    skill: skill as SkillPick["skill"],
    strategy: st.id,
    cardId: st.card as CardId,
    variantKeys: variantKeysFor(reg.card.get(st.card), { state, facts, band, now, reg }),
    onShow: st.onShow,
    ...(st.interactive ? { interactive: st.interactive } : {}),
  };
}

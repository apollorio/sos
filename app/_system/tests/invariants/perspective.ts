/**
 * L10 — actor defines perspective. Shared check used by the fast perspective test and by the exhaustive tiers:
 * a non-P0 card shown while actor=helper must resolve to helper-addressed copy, unless the card is declared
 * actor-neutral below (its wording is valid for whoever holds the phone) or it is a helper-only question card.
 */
import { REG } from "../../src/core/registry";
import { LOCALES } from "../../src/ui/locale";
import type { SkillPick } from "../../src/core/domain/decision";

export const ACTOR_NEUTRAL = new Set([
  "CARD_Q_ACTOR", "CARD_Q_NOISE", "CARD_STEADY_CHECK", "CARD_SESSION_CLOSED", "CARD_SAFE_FALLBACK",
  "CARD_CONFIRM_FRIEND", "CARD_CONFIRM_RELOCATION", "CARD_CONFIRM_CONTACT", "CARD_CONFIRM_CHECKIN",
]);

const variantEntries = REG.data.questions.flatMap((q) => Object.entries(q.variants));
export const HELPER_ONLY = new Set(
  variantEntries.filter(([k]) => k === "helper").map(([, v]) => v.card)
    .filter((card) => !variantEntries.some(([k, v]) => k !== "helper" && v.card === card)),
);

type Text = string | Record<string, string>;

export function helperPerspectiveViolation(pick: SkillPick, band: string): string | null {
  if (band === "P0" || ACTOR_NEUTRAL.has(pick.cardId) || HELPER_ONLY.has(pick.cardId)) return null;
  const lc = LOCALES["pt-BR"]!.cards[pick.cardId];
  if (!lc) return `${pick.cardId} has no pt-BR copy`;
  const chosen = (t: Text): string | null => (typeof t === "string" ? null : pick.variantKeys.find((k) => t[k] !== undefined) ?? "default");
  const keys = [chosen(lc.title), chosen(lc.body)].filter((k): k is string => k !== null);
  return keys.some((k) => k === "helper" || k.endsWith(".helper")) ? null : `${pick.cardId} renders [${keys.join(", ") || "plain string"}] copy to a helper`;
}

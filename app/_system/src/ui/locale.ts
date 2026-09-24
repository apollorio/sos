/**
 * Copy resolution — the ONLY place UI text is chosen. Pure. No text lives in code.
 * Variant fallback: first key in card.variantKeys that exists in the locale entry, else "default".
 */
import type { CardView } from "../core/domain/decision";
import type { Reg } from "../core/registry";
import ptBR from "../../registry/locales/pt-BR.json";

type Text = string | Record<string, string>;
export interface LocaleCard { review: string; clinical?: boolean; education?: boolean; title: Text; body: Text; aside?: string; actions: Record<string, string> }
export interface Locale {
  locale: string;
  shell: Record<string, string>;
  notices: Record<string, string>;
  handoff: Record<string, string>;
  chips: Record<string, { label: string }>;
  cards: Record<string, LocaleCard>;
}

export const LOCALES: Record<string, Locale> = { "pt-BR": ptBR as unknown as Locale };

export function pickText(t: Text | undefined, keys: string[]): string {
  if (t === undefined) return "";
  if (typeof t === "string") return t;
  for (const k of keys) if (t[k] !== undefined) return t[k]!;
  return t["default"] ?? "";
}

export interface ResolvedAction { id: string; label: string; emphasis: string; href?: string }
export interface ResolvedCard { title: string; body: string; aside?: string; actions: ResolvedAction[]; review: string }

export function resolveCard(card: CardView, locale: Locale, reg: Reg): ResolvedCard {
  const lc = locale.cards[card.cardId];
  if (!lc) throw new Error(`locale ${locale.locale}: missing ${card.cardId}`);
  return {
    title: pickText(lc.title, card.variantKeys),
    body: pickText(lc.body, card.variantKeys),
    ...(lc.aside ? { aside: lc.aside } : {}),
    review: lc.review,
    actions: card.actions.map((a) => ({
      id: a.id,
      label: lc.actions[a.id] ?? `⚠${a.id}`,
      emphasis: a.emphasis,
      ...(a.handoff ? { href: handoffHref(a.handoff, locale, reg) } : {}),
    })),
  };
}

/**
 * Handoffs are NATIVE LINKS rendered as <a href>, so the browser performs them inside the
 * user's own gesture — no server, no stored number, nothing for a bot to abuse (L10, L12).
 */
export function handoffHref(h: { channel: string; target: string }, locale: Locale, reg: Reg): string {
  if (h.target === "trusted") {
    const text = encodeURIComponent(locale.handoff["trusted_message"] ?? "");
    return h.channel === "whatsapp" ? `https://wa.me/?text=${text}` : `sms:?&body=${text}`;
  }
  const n = reg.numbers[h.target];
  if (!n) throw new Error(`no number for handoff target ${h.target}`);
  return `tel:${n.tel}`;
}

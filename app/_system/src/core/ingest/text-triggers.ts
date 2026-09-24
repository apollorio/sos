/**
 * LOCAL TRIGGERS — free text is NOT chat (v1 has no open chat, no NLP, no LLM).
 * Asymmetric cost: an affirmative match acts immediately (a false P0 costs one tap: "Me enganei");
 * a NEGATED match ("não tô com dor no peito") asks explicitly instead of acting.
 * The raw text is never stored or logged — only trigger ids.
 */
import type { Reg } from "../registry";
import type { Primitive } from "../domain/signals";
import { normalizeText } from "./normalize-text";

export interface TriggerMatch {
  affirmative: { id: string; set: Record<string, Primitive> }[];
  negated: { id: string; ask: string }[];
}

export function matchTriggers(text: string, reg: Reg): TriggerMatch {
  const norm = normalizeText(text);
  const { negators, negationWindow } = reg.data.textTriggers;
  const out: TriggerMatch = { affirmative: [], negated: [] };
  if (!norm) return out;
  for (const t of reg.compiledTriggers) {
    for (const re of t.regexes) {
      const m = re.exec(norm);
      if (!m) continue;
      const before = norm.slice(0, m.index).trim().split(" ").filter(Boolean).slice(-negationWindow);
      const negated = before.some((w) => negators.includes(w));
      if (negated) {
        if (t.onNegated) out.negated.push({ id: t.id, ask: t.onNegated.ask });
      } else {
        out.affirmative.push({ id: t.id, set: t.set });
      }
      break; // one match per trigger is enough
    }
  }
  return out;
}

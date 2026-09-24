/**
 * VOI ENGINE — the "Akinator" without AI.
 *
 * Akinator picks the question that best splits its hypothesis space. We do the deterministic,
 * safety-first equivalent: for every askable question we SIMULATE each possible answer through
 * the real (pure) decision pipeline and look at what would happen next.
 *
 *   critical    some answer would put us in P0            → ask NOW (before any intervention)
 *   decisive    some answer would change the next action  → ask if the band's budget allows
 *   irrelevant  no answer changes anything                → never ask (L08)
 *
 * No probabilities, no weights, no model: a counterfactual run of the same code that decides.
 * Cost: ~questions × answers × decideCore ≈ 40 pure evaluations per step (sub-millisecond).
 */
import type { Reg } from "../registry";
import type { SessionState } from "../domain/state";
import type { QuestionDef, QuestionVariantDef } from "../registry/types";
import type { VoiClass } from "../domain/decision";
import type { Facts } from "../logic/predicate";
import type { NonP0Band } from "../../generated/registry.gen";
import { applySignals } from "../state/signals-apply";
import { signalValue } from "../logic/facts";

export interface QuestionScore {
  q: QuestionDef;
  cls: VoiClass;
}

export function variantFor(q: QuestionDef, facts: Facts): QuestionVariantDef | null {
  const actor = String(facts["signal.actor"] ?? "unknown");
  return q.variants[actor] ?? q.variants["any"] ?? null;
}

/** Can this question be asked right now? `pinned` = a policy rule explicitly asks for it. */
export function askable(
  q: QuestionDef,
  state: SessionState,
  facts: Facts,
  band: NonP0Band,
  now: number,
  reg: Reg,
  pinned = false,
): QuestionVariantDef | null {
  const variant = variantFor(q, facts);
  if (!variant) return null;
  if (!q.bands.includes(band)) return null;
  const mem = state.questions[q.id as keyof typeof state.questions];
  if (mem && mem.asks >= q.maxAsks) return null;
  if (mem?.lastUnknownAt != null && now - mem.lastUnknownAt < q.cooldownSec * 1000) return null;
  if (pinned) return variant;
  // At least one of the signals this variant can set must be unknown (and therefore not latched).
  const touched = new Set(variant.answers.flatMap((a) => Object.keys(a.set)));
  for (const sig of touched) {
    if (!reg.signal.has(sig)) continue;
    if (signalValue(state, sig, now) === "unknown") return variant;
  }
  return null;
}

export type CoreOutcome = { band: string; key: string };
export type CoreDecider = (state: SessionState, now: number, reg: Reg) => CoreOutcome;

export function rankQuestions(
  state: SessionState,
  facts: Facts,
  band: NonP0Band,
  base: CoreOutcome,
  now: number,
  reg: Reg,
  decideCore: CoreDecider,
): QuestionScore[] {
  const scored: QuestionScore[] = [];
  for (const q of reg.data.questions) {
    if (q.prerequisite) continue;
    const variant = askable(q, state, facts, band, now, reg);
    if (!variant) continue;
    let critical = false;
    let decisive = false;
    for (const a of variant.answers) {
      if (a.unknown) continue;
      // Copy-on-write: applySignals only mutates `signals` and `anxietyHistory` (both re-created here).
      const sim: SessionState = { ...state, signals: { ...state.signals }, anxietyHistory: [...state.anxietyHistory] };
      applySignals(sim, a.set, "user_explicit", now, reg);
      const o = decideCore(sim, now, reg);
      if (o.band === "P0") critical = true;
      if (o.key !== base.key) decisive = true;
    }
    const cls: VoiClass = critical ? "critical" : decisive ? "decisive" : "irrelevant";
    if (cls !== "irrelevant") scored.push({ q, cls });
  }
  const rank = (c: VoiClass) => (c === "critical" ? 0 : 1);
  return scored.sort((a, b) => rank(a.cls) - rank(b.cls) || a.q.priority - b.q.priority);
}

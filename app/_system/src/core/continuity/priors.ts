/**
 * STRATEGY PRIORS — longitudinal personalization without profiling (Blueprint v0.2 §8). PURE.
 * A prior is discrete ("helpful" | "unhelpful"), needs repetition (registry.continuity.evidence) and decays by
 * bucket: RECENT ∪ RELEVANT evidence wins; OLD evidence counts only when nothing newer exists.
 * Priors can ONLY reorder strategies that are already eligible; fallbacks stay last (INV-021).
 */
import type { Reg } from "../registry";
import type { StrategyDef } from "../registry/types";
import type { ContinuitySnapshot, StrategyPriors, StrategyPrior, BucketEvidence } from "./types";

export function strategyPriors(snap: ContinuitySnapshot, reg: Reg): StrategyPriors {
  const ev = reg.data.continuity.evidence;
  const out: Record<string, StrategyPrior> = {};
  for (const h of snap.strategyHistory) {
    const fresh = sum(h.byBucket.RECENT, h.byBucket.RELEVANT);
    const e = fresh.attempted > 0 ? fresh : h.byBucket.OLD;
    if (e.attempted < ev.minAttempted) continue;
    if (e.better >= ev.minBetterForHelpful) out[h.strategy] = "helpful";
    else if (e.better === 0 && e.negative >= ev.minNegativeForUnhelpful) out[h.strategy] = "unhelpful";
  }
  return out;
}

function sum(a: BucketEvidence, b: BucketEvidence): BucketEvidence {
  return { attempted: a.attempted + b.attempted, better: a.better + b.better, negative: a.negative + b.negative };
}

/** Stable reorder of an ELIGIBLE list: helpful → neutral → unhelpful; always-eligible fallbacks keep the tail, in order. */
export function reorderByPriors(skillId: string, eligible: StrategyDef[], priors: StrategyPriors): StrategyDef[] {
  const rank = (st: StrategyDef): number => {
    if (st.alwaysEligible) return 3;
    const p = priors[`${skillId}.${st.id}`];
    return p === "helpful" ? 0 : p === "unhelpful" ? 2 : 1;
  };
  return eligible.map((st, i) => ({ st, i, r: rank(st) })).sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.st);
}

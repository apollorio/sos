import type { RecencyBucket } from "../../generated/registry.gen";

export interface OutcomeCounts { better: number; same: number; worse: number; unknown: number }
export interface BucketEvidence { attempted: number; better: number; negative: number }

/** Operational evidence about one strategy. Counts, never probabilities (B2). */
export interface StrategyHistory {
  strategy: string; // "skill.strategy"
  offered: number;
  attempted: number; // done + failed
  completed: number;
  failed: number;
  declined: number;
  outcome: OutcomeCounts;
  lastUsedAt: number | null;
  bucket: RecencyBucket | null;
  byBucket: Record<RecencyBucket, BucketEvidence>;
}

export interface ContinuitySnapshot {
  v: 1;
  derivedAt: number;
  windowDays: number;
  episodeCount: number;
  lastEpisodeAt: number | null;
  previousP0Count: number;
  strategyHistory: StrategyHistory[];
  supportPatterns: { episodesAlone: number; improvedAfterSupport: number; declinedContact: number };
  recurring: { loudEnvironment: number; highAnxiety: number; alone: number; impaired: number };
}

export type StrategyPrior = "helpful" | "unhelpful";
/** The ONLY thing the continuity plane feeds back into the acute plane (INV-020, INV-021). */
export type StrategyPriors = Readonly<Record<string, StrategyPrior>>;

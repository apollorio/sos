/**
 * CONTINUITY SNAPSHOT — small, derived, deterministic (Blueprint v0.2 §7). PURE.
 * Input: journal events of up to 180 days (possibly many episodes). Output: counts a person or a policy can use.
 * It never produces a diagnosis (L16) and never a probability (B2).
 */
import type { Reg } from "../registry";
import type { RecencyBucket } from "../../generated/registry.gen";
import type { JournalEvent } from "../journal/journal";
import type { ContinuitySnapshot, StrategyHistory, BucketEvidence } from "./types";
import { purgeExpired, bucketOf, episodeStarts } from "./retention";

const INTERVENTION_SKILLS = new Set(["reduce_stimulation", "contact_trusted_person", "grounding", "steady_check"]);

function emptyHistory(strategy: string): StrategyHistory {
  const b = (): BucketEvidence => ({ attempted: 0, better: 0, negative: 0 });
  return { strategy, offered: 0, attempted: 0, completed: 0, failed: 0, declined: 0, outcome: { better: 0, same: 0, worse: 0, unknown: 0 }, lastUsedAt: null, bucket: null, byBucket: { RECENT: b(), RELEVANT: b(), OLD: b() } };
}

export function deriveSnapshot(all: JournalEvent[], now: number, reg: Reg): ContinuitySnapshot {
  const events = purgeExpired(all, now, reg).slice().sort((a, b) => a.clientObservedAt - b.clientObservedAt || a.clientSeq - b.clientSeq);
  const starts = episodeStarts(events);
  const byEpisode = new Map<string, JournalEvent[]>();
  for (const e of events) (byEpisode.get(e.episodeId) ?? byEpisode.set(e.episodeId, []).get(e.episodeId)!).push(e);

  const hist = new Map<string, StrategyHistory>();
  const h = (key: string) => hist.get(key) ?? hist.set(key, emptyHistory(key)).get(key)!;
  const windowMs = reg.data.continuity.evidence.outcomeWindowSec * 1000;

  let previousP0Count = 0;
  let episodesAlone = 0, improvedAfterSupport = 0, declinedContact = 0, loud = 0, highAnxiety = 0, impaired = 0;

  for (const [, evs] of byEpisode) {
    let sawP0 = false, alone = false, aloneAt: number | null = null, supportAt: number | null = null, improvedAfter = false, sawLoud = false, sawHigh = false, sawImpaired = false;
    // Attribution: the first reportedTrend after an intervention card (within the window, before the next one) is its outcome.
    let open: { key: string; at: number } | null = null;
    for (const e of evs) {
      const p = e.payload;
      switch (e.kind) {
        case "BAND_CHANGED":
          if (p["to"] === "P0") sawP0 = true;
          break;
        case "CARD_SHOWN": {
          if (p["kind"] !== "action" || typeof p["skill"] !== "string" || !INTERVENTION_SKILLS.has(p["skill"]) || typeof p["strategy"] !== "string") break;
          const key = `${p["skill"]}.${p["strategy"]}`;
          if (open && open.key !== key) h(open.key).outcome.unknown += 1;
          const s = h(key);
          s.offered += 1;
          s.lastUsedAt = Math.max(s.lastUsedAt ?? 0, e.clientObservedAt);
          open = { key, at: e.clientObservedAt };
          break;
        }
        case "STRATEGY_OUTCOME": {
          const key = `${String(p["skill"])}.${String(p["strategy"])}`;
          const s = h(key);
          const bucket = bucketOf(now - e.clientObservedAt, reg);
          if (p["outcome"] === "done") { s.completed += 1; s.attempted += 1; if (bucket) s.byBucket[bucket].attempted += 1; }
          else if (p["outcome"] === "failed") { s.failed += 1; s.attempted += 1; if (bucket) { s.byBucket[bucket].attempted += 1; s.byBucket[bucket].negative += 1; } }
          else { s.declined += 1; if (String(p["skill"]) === "contact_trusted_person") declinedContact += 1; }
          break;
        }
        case "SIGNAL_REPORTED": {
          const sig = String(p["signal"]);
          const val = p["value"];
          if (sig === "reportedTrend" && open && e.clientObservedAt - open.at <= windowMs && (val === "better" || val === "same" || val === "worse")) {
            const s = h(open.key);
            s.outcome[val] += 1;
            const bucket = bucketOf(now - e.clientObservedAt, reg);
            if (bucket) { if (val === "better") s.byBucket[bucket].better += 1; if (val === "worse") s.byBucket[bucket].negative += 1; }
            open = null;
          }
          if (sig === "company" && val === "alone") { alone = true; aloneAt ??= e.clientObservedAt; }
          if ((sig === "company" && val === "with_someone") || (sig === "companion" && val === "arrived")) { if (aloneAt !== null) supportAt ??= e.clientObservedAt; }
          if (sig === "reportedTrend" && val === "better" && supportAt !== null && e.clientObservedAt >= supportAt) improvedAfter = true;
          if (sig === "noise" && val === "loud") sawLoud = true;
          if (sig === "anxiety" && typeof val === "number" && val >= 3) sawHigh = true;
          if (sig === "responsiveness" && val === "impaired") sawImpaired = true;
          break;
        }
        default:
          break;
      }
    }
    if (open) h(open.key).outcome.unknown += 1;
    if (sawP0) previousP0Count += 1;
    if (alone) episodesAlone += 1;
    if (improvedAfter) improvedAfterSupport += 1;
    if (sawLoud) loud += 1;
    if (sawHigh) highAnxiety += 1;
    if (sawImpaired) impaired += 1;
  }

  for (const s of hist.values()) s.bucket = s.lastUsedAt === null ? null : bucketOf(now - s.lastUsedAt, reg);
  const lastEpisodeAt = starts.size ? Math.max(...starts.values()) : null;

  return {
    v: 1,
    derivedAt: now,
    windowDays: reg.data.continuity.retention.journalDays,
    episodeCount: byEpisode.size,
    lastEpisodeAt,
    previousP0Count,
    strategyHistory: [...hist.values()].sort((a, b) => a.strategy.localeCompare(b.strategy)),
    supportPatterns: { episodesAlone, improvedAfterSupport, declinedContact },
    recurring: { loudEnvironment: loud, highAnxiety, alone: episodesAlone, impaired },
  };
}

export const RECENCY_ORDER: RecencyBucket[] = ["RECENT", "RELEVANT", "OLD"];

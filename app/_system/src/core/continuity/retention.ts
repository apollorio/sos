/** Retention (Phase 2): an episode lives `journalDays`; after that every one of its events is purged together. PURE. */
import type { Reg } from "../registry";
import type { JournalEvent } from "../journal/journal";

const DAY = 86_400_000;

export function episodeStarts(events: JournalEvent[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of events) {
    const cur = m.get(e.episodeId);
    if (cur === undefined || e.clientObservedAt < cur) m.set(e.episodeId, e.clientObservedAt);
  }
  return m;
}

export function purgeExpired(events: JournalEvent[], now: number, reg: Reg): JournalEvent[] {
  const limit = now - reg.data.continuity.retention.journalDays * DAY;
  const starts = episodeStarts(events);
  return events.filter((e) => (starts.get(e.episodeId) ?? 0) >= limit);
}

export function bucketOf(ageMs: number, reg: Reg): "RECENT" | "RELEVANT" | "OLD" | null {
  const b = reg.data.continuity.buckets;
  const days = ageMs / DAY;
  if (days < 0) return "RECENT";
  if (days <= b.RECENT) return "RECENT";
  if (days <= b.RELEVANT) return "RELEVANT";
  if (days <= b.OLD) return "OLD";
  return null;
}

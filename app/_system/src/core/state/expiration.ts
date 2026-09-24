/**
 * TTL fallback: "time beats stale data" — but only for NON-latched values (L03).
 * Latched values are stored with expiresAt = null, so this function can never de-escalate P0.
 */
import type { SessionState } from "../domain/state";
import type { SignalRecord } from "../domain/signals";

export function expireSignals(state: SessionState, now: number): string[] {
  const expired: string[] = [];
  const table = state.signals as Record<string, SignalRecord | undefined>;
  for (const [id, rec] of Object.entries(table)) {
    if (rec && rec.expiresAt !== null && rec.expiresAt <= now) {
      delete table[id];
      expired.push(id);
    }
  }
  return expired;
}

export function nextSignalExpiry(state: SessionState, now: number): number | null {
  let min: number | null = null;
  for (const rec of Object.values(state.signals as Record<string, SignalRecord | undefined>)) {
    if (rec && rec.expiresAt !== null && rec.expiresAt > now && (min === null || rec.expiresAt < min)) min = rec.expiresAt;
  }
  return min;
}

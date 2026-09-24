/**
 * BAND ENGINE (non-P0): first matching band rule → raw band, then hysteresis.
 *   - Upgrades (more severe) are immediate.
 *   - Leaving a sticky band needs an explicit human input AND (minDwellSec OR improvement) (L03).
 *   - Non-sticky bands (entered only because of uncertainty) drop as soon as answers arrive (L02).
 */
import type { Reg } from "../registry";
import type { BandState } from "../domain/state";
import type { NonP0Band } from "../../generated/registry.gen";
import { evaluate, type Facts, type TraceLeaf } from "../logic/predicate";

export interface BandOutcome {
  next: BandState;
  raw: NonP0Band;
  ruleId: string;
  because: TraceLeaf[];
  held: boolean;
}

export function determineBand(prev: BandState | null, facts: Facts, now: number, reg: Reg, explicit: boolean): BandOutcome {
  let raw: { band: NonP0Band; ruleId: string; sticky: boolean; because: TraceLeaf[] } | null = null;
  for (const r of reg.data.bandRules) {
    const e = evaluate(r.when, facts);
    if (e.ok) {
      raw = { band: r.band as NonP0Band, ruleId: r.id, sticky: r.sticky, because: e.because };
      break;
    }
  }
  if (!raw) throw new Error("band-engine: band table is not total (lint INV-018 should have caught this)");

  const fresh: BandState = { current: raw.band, since: now, ruleId: raw.ruleId, sticky: raw.sticky };
  if (!prev) return { next: fresh, raw: raw.band, ruleId: raw.ruleId, because: raw.because, held: false };

  const rank = reg.bandRank;
  const rNew = rank[raw.band]!;
  const rOld = rank[prev.current]!;

  if (rNew < rOld) return { next: fresh, raw: raw.band, ruleId: raw.ruleId, because: raw.because, held: false };
  if (rNew === rOld) {
    return { next: { ...prev, ruleId: raw.ruleId, sticky: raw.sticky }, raw: raw.band, ruleId: raw.ruleId, because: raw.because, held: false };
  }
  // Downgrade requested.
  const dwell = (reg.data.hysteresis.minDwellSec[prev.current] ?? 0) * 1000;
  const improving = facts["trend"] === "improving";
  // L03: time alone never de-escalates a sticky band. It takes a human input in this very step.
  if (!prev.sticky || (explicit && (now - prev.since >= dwell || improving))) {
    return { next: fresh, raw: raw.band, ruleId: raw.ruleId, because: raw.because, held: false };
  }
  return {
    next: prev,
    raw: raw.band,
    ruleId: prev.ruleId,
    because: [{ path: "band.hysteresis", op: "held", expected: prev.current, actual: raw.band }],
    held: true,
  };
}


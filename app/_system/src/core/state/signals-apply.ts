/**
 * The single code path that writes signals. Used by the reducer AND by the VOI simulator,
 * so a hypothetical answer is processed exactly like a real one.
 */
import type { Reg } from "../registry";
import type { SessionState } from "../domain/state";
import type { Primitive, Source, SignalRecord } from "../domain/signals";
import { evaluate } from "../logic/predicate";
import { buildFacts, signalValue } from "../logic/facts";

export interface ApplyReport {
  ignoredLatched: string[];
  ignoredNotExplicit: string[];
  invalidations: string[];
}

export function applySignals(
  state: SessionState,
  set: Record<string, Primitive>,
  source: Source,
  now: number,
  reg: Reg,
  depth = 0,
): ApplyReport {
  const report: ApplyReport = { ignoredLatched: [], ignoredNotExplicit: [], invalidations: [] };
  const table = state.signals as Record<string, SignalRecord | undefined>;

  for (const [id, value] of Object.entries(set)) {
    const def = reg.signal.get(id);
    if (!def) throw new Error(`applySignals: unknown signal ${id}`);
    if (!def.domain.includes(value)) throw new Error(`applySignals: ${String(value)} ∉ domain(${id})`);

    // INV-012: some signals may only come from an explicit user answer.
    if (def.explicitOnly && source !== "user_explicit") {
      report.ignoredNotExplicit.push(id);
      continue;
    }
    // L03: a latched critical value is never overwritten by a normal report (only CORRECTION).
    const current = signalValue(state, id, now);
    if (def.latched.includes(current) && current !== value) {
      report.ignoredLatched.push(id);
      continue;
    }

    if (value === "unknown") {
      table[id] = { value, source, observedAt: now, expiresAt: null };
    } else {
      const byValue = def.ttlByValue?.[String(value)];
      const ttl = def.latched.includes(value) ? null : (byValue ?? def.ttlSec);
      table[id] = { value, source, observedAt: now, expiresAt: ttl === null ? null : now + ttl * 1000 };
    }
    if (id === "anxiety" && typeof value === "number") {
      state.anxietyHistory = [...state.anxietyHistory, { value, at: now }].slice(-3);
    }

    // Semantic invalidation: explicit events replace older facts immediately (L02).
    if (depth < 2) {
      for (const inv of reg.data.invalidation) {
        if (inv.on.signal !== id || inv.on.value !== value) continue;
        if (inv.onlyIf && !evaluate(inv.onlyIf, buildFacts(state, now, reg).facts).ok) continue;
        report.invalidations.push(inv.id);
        if (inv.set) {
          const sub = applySignals(state, inv.set, "derived_rule", now, reg, depth + 1);
          report.ignoredLatched.push(...sub.ignoredLatched);
          report.invalidations.push(...sub.invalidations);
        }
        for (const e of inv.expire ?? []) expireSignal(state, e, now, reg);
      }
    }
  }
  return report;
}

/** Make a signal "unknown & askable" on purpose — never touches latched critical values. */
export function expireSignal(state: SessionState, id: string, now: number, reg: Reg): void {
  const def = reg.signal.get(id);
  if (!def) throw new Error(`expireSignal: unknown signal ${id}`);
  const current = signalValue(state, id, now);
  if (def.latched.includes(current)) return;
  delete (state.signals as Record<string, unknown>)[id];
}

/** CORRECTION is the only path allowed to clear a latched value. */
export function resetSignal(state: SessionState, id: string): void {
  delete (state.signals as Record<string, unknown>)[id];
}

/**
 * Commitments: things the runtime must not forget while the conversation moves on
 * ("João tá vindo"). Time makes them DUE; only explicit events resolve them.
 */
import type { Reg } from "../registry";
import type { Commitment, SessionState } from "../domain/state";
import type { Op } from "../registry/types";

export function createCommitment(state: SessionState, kind: string, now: number, reg: Reg): void {
  const def = reg.commitment.get(kind);
  if (!def) throw new Error(`commitment: unknown kind ${kind}`);
  if (state.commitments.some((c) => c.kind === kind && c.status === "pending")) return; // idempotent
  state.commitmentSeq += 1;
  state.commitments.push({
    id: `${kind}#${state.commitmentSeq}`,
    kind,
    status: "pending",
    createdAt: now,
    dueAt: now + def.defaultDueSec * 1000,
    snoozes: 0,
  });
}

/** Returns ops to run when a commitment is missed (snoozed past its limit). */
export function resolveCommitment(
  state: SessionState,
  kind: string,
  outcome: "done" | "snooze" | "cancel",
  now: number,
  reg: Reg,
): Op[] {
  const c = state.commitments.find((x) => x.kind === kind && x.status === "pending");
  if (!c) return [];
  const def = reg.commitment.get(kind)!;
  if (outcome === "done") c.status = "done";
  else if (outcome === "cancel") c.status = "cancelled";
  else if (c.snoozes < def.maxSnoozes) {
    c.snoozes += 1;
    c.dueAt = now + def.snoozeSec * 1000;
  } else {
    c.status = "missed";
    return def.onMissed;
  }
  return [];
}

export function dueCommitments(state: SessionState, now: number): Commitment[] {
  return state.commitments.filter((c) => c.status === "pending" && c.dueAt <= now).sort((a, b) => a.dueAt - b.dueAt);
}

export function nextCommitmentDue(state: SessionState, now: number): number | null {
  let min: number | null = null;
  for (const c of state.commitments) if (c.status === "pending" && c.dueAt > now && (min === null || c.dueAt < min)) min = c.dueAt;
  return min;
}

/** Keep the list short: resolved commitments older than 1h are dropped. */
export function pruneCommitments(state: SessionState, now: number): void {
  state.commitments = state.commitments.filter((c) => c.status === "pending" || now - c.createdAt < 3_600_000);
}

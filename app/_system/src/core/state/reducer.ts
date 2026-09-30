/**
 * REDUCER — pure state transition for ONE domain event.
 * Mutates a working copy that processEvent() cloned; never touches I/O or the clock.
 */
import type { Reg } from "../registry";
import type { SessionState } from "../domain/state";
import type { DomainEvent } from "../domain/events";
import type { Op } from "../registry/types";
import { applySignals, expireSignal, resetSignal } from "./signals-apply";
import { createCommitment, resolveCommitment } from "./commitments";

export interface ReduceNotes {
  notes: string[];
  notice?: "TEXT_UNMATCHED";
  wiped?: boolean;
}

export function reduce(state: SessionState, ev: DomainEvent, now: number, reg: Reg, out: ReduceNotes): void {
  switch (ev.type) {
    case "SESSION_STARTED":
    case "TICK":
      return;

    case "SIGNALS_REPORTED": {
      const r = applySignals(state, ev.set, ev.source, now, reg);
      if (r.ignoredLatched.length) out.notes.push(`latched:${r.ignoredLatched.join(",")}`);
      if (r.ignoredNotExplicit.length) out.notes.push(`not-explicit:${r.ignoredNotExplicit.join(",")}`);
      if (r.invalidations.length) out.notes.push(`invalidated:${r.invalidations.join(",")}`);
      if (ev.questionId) {
        const q = (state.questions[ev.questionId as keyof typeof state.questions] ??= { asks: 0, lastAskedAt: null, lastUnknownAt: null });
        if (ev.unknownAnswer) q.lastUnknownAt = now;
      }
      if (ev.questionId && state.forcedQuestion === ev.questionId) state.forcedQuestion = null;
      return;
    }

    case "SIGNALS_EXPIRED":
      for (const s of ev.signals) expireSignal(state, s, now, reg);
      return;

    case "STRATEGY_OUTCOME": {
      const key = `${ev.skill}.${ev.strategy}`;
      const def = reg.strategy.get(key);
      if (!def) throw new Error(`reducer: unknown strategy ${key}`);
      const mem = (state.strategies[key] ??= { doneAt: null, blockedUntil: null, shows: 0 });
      if (state.requested?.key === key) state.requested = null; // the request was answered
      if (ev.outcome === "done") mem.doneAt = now;
      else if (ev.outcome === "failed") mem.blockedUntil = now + def.blockSec * 1000; // L09: invalidate the strategy
      else mem.blockedUntil = now + def.cooldownSec * 1000;
      return;
    }

    case "STRATEGY_REQUESTED": {
      const key = `${ev.skill}.${ev.strategy}`;
      if (!reg.strategy.get(key)) throw new Error(`reducer: unknown strategy ${key}`);
      state.requested = { key, at: now };
      return;
    }

    case "COMMITMENT_CREATED":
      createCommitment(state, ev.kind, now, reg);
      return;

    case "COMMITMENT_RESOLVED": {
      const missedOps = resolveCommitment(state, ev.kind, ev.outcome, now, reg);
      for (const op of missedOps) for (const e of opToEvents(op, state)) reduce(state, e, now, reg, out);
      return;
    }

    case "HANDOFF_OPENED":
      if (ev.target === "emergency") state.flags.emergencyEngaged = true;
      return;

    case "EMERGENCY_CALL_REPORTED":
      state.flags.emergencyEngaged = true;
      return;

    case "HELP_ON_SCENE":
      state.flags.helpOnScene = true;
      return;

    case "CORRECTION": {
      if (!state.p0) return;
      const rule = reg.hardRule.get(state.p0.ruleId);
      for (const s of rule?.onCorrection.reset ?? []) resetSignal(state, s);
      if (rule?.reason === "user_initiated") state.flags.emergencyEngaged = false;
      state.flags.helpOnScene = false;
      state.silence.count = 0;
      state.p0 = null;
      out.notes.push(`correction:${rule?.id ?? "?"}`);
      return;
    }

    case "QUESTION_FORCED":
      state.forcedQuestion = ev.questionId;
      return;

    case "TEXT_UNMATCHED":
      out.notice = "TEXT_UNMATCHED";
      return;

    case "SESSION_END":
      state.status = "ended";
      return;

    case "WIPE":
      state.status = "wiped";
      out.wiped = true;
      return;

    case "APP_HIDDEN":
      if (state.visibility.visible) state.visibility = { visible: false, since: now };
      return;

    case "APP_VISIBLE": {
      if (!state.visibility.visible) {
        const gap = now - state.visibility.since;
        if (state.card && gap >= reg.data.silence.resumeGapSec * 1000) state.flags.resumedAfterGap = true;
        state.visibility = { visible: true, since: now };
        state.silence.windowStart = now; // hidden time never counts as silence (L06)
      }
      return;
    }

    case "CONNECTIVITY":
      state.connectivity = ev.online ? "online" : "offline";
      return;

    default: {
      const never: never = ev;
      throw new Error(`reducer: unhandled event ${JSON.stringify(never)}`);
    }
  }
}

/** Registry ops → domain events. `ctx` fills skill/strategy from the card the op came from. */
export function opToEvents(op: Op, state: SessionState, ctx?: { skill?: string; strategy?: string | null }): DomainEvent[] {
  switch (op.op) {
    case "SIGNALS_REPORTED":
      return [{ type: "SIGNALS_REPORTED", set: op.set, source: (op.source as "derived_rule") ?? "user_explicit" }];
    case "SIGNALS_EXPIRED":
      return [{ type: "SIGNALS_EXPIRED", signals: op.signals }];
    case "STRATEGY_OUTCOME": {
      const skill = op.skill ?? ctx?.skill;
      const strategy = op.strategy ?? ctx?.strategy ?? state.card?.strategy ?? null;
      if (!skill || !strategy) return [];
      return [{ type: "STRATEGY_OUTCOME", skill, strategy, outcome: op.outcome }];
    }
    case "STRATEGY_REQUESTED":
      return [{ type: "STRATEGY_REQUESTED", skill: op.skill, strategy: op.strategy }];
    case "COMMITMENT_CREATED":
      return [{ type: "COMMITMENT_CREATED", kind: op.kind }];
    case "COMMITMENT_RESOLVED":
      return [{ type: "COMMITMENT_RESOLVED", kind: op.kind, outcome: op.outcome }];
    case "HANDOFF_OPENED":
      return [{ type: "HANDOFF_OPENED", channel: op.channel, target: op.target }];
    case "EMERGENCY_CALL_REPORTED":
      return [{ type: "EMERGENCY_CALL_REPORTED" }];
    case "HELP_ON_SCENE":
      return [{ type: "HELP_ON_SCENE" }];
    case "CORRECTION":
      return [{ type: "CORRECTION" }];
    case "SESSION_END":
      return [{ type: "SESSION_END" }];
    case "WIPE":
      return [{ type: "WIPE" }];
  }
}

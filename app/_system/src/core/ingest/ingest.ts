/**
 * INGEST — RawInput → DomainEvent[]. The only translator between the outside world and the reducer.
 * Validates card instance, action id, stale taps (INV-015) and chip preconditions.
 */
import type { Reg } from "../registry";
import type { SessionState } from "../domain/state";
import type { DomainEvent, RawInput } from "../domain/events";
import { HUMAN_INPUT_KINDS } from "../domain/events";
import { opToEvents } from "../state/reducer";
import { matchTriggers } from "./text-triggers";
import { variantFor } from "../planner/voi";
import { buildFacts } from "../logic/facts";
import { chipAvailable } from "../planner/chips";
import type { Output } from "../domain/decision";

export interface Ingested {
  events: DomainEvent[];
  human: boolean;
  rejected?: "STALE_CARD" | "UNKNOWN_ACTION";
  summary: string;
  notice?: Output["notice"];
}

export function ingest(state: SessionState, input: RawInput, now: number, reg: Reg): Ingested {
  const human = HUMAN_INPUT_KINDS.has(input.kind);
  switch (input.kind) {
    case "boot":
      return { events: [{ type: "SESSION_STARTED", sessionId: input.sessionId }], human, summary: "boot" };

    case "runtime": {
      const map = {
        APP_HIDDEN: { type: "APP_HIDDEN" },
        APP_VISIBLE: { type: "APP_VISIBLE" },
        ONLINE: { type: "CONNECTIVITY", online: true },
        OFFLINE: { type: "CONNECTIVITY", online: false },
        TICK: { type: "TICK" },
      } as const satisfies Record<typeof input.event, DomainEvent>;
      return { events: [map[input.event]], human, summary: `runtime:${input.event}` };
    }

    case "shell":
      return { events: [{ type: "HANDOFF_OPENED", channel: "tel", target: "emergency" }], human, summary: "shell:call_192" };

    case "chip": {
      // Only a chip that is on offer right now can be used (same pure rule that rendered it).
      const chip = reg.chip.get(input.chipId);
      const ok = chip && chipAvailable(chip, state, buildFacts(state, now, reg).facts, state.shownBand, now, reg);
      if (!chip || !ok) return { events: [], human, rejected: "UNKNOWN_ACTION", summary: `chip:${input.chipId}:rejected` };
      return {
        events: chip.action.ops.flatMap((op) => opToEvents(op, state)),
        human,
        summary: `chip:${input.chipId}`,
        ...(chip.notice ? { notice: chip.notice as Output["notice"] } : {}),
      };
    }

    case "text": {
      const m = matchTriggers(input.text, reg);
      const events: DomainEvent[] = [];
      for (const a of m.affirmative) events.push({ type: "SIGNALS_REPORTED", set: a.set, source: "text_trigger", triggerId: a.id });
      if (!m.affirmative.length && m.negated[0]) events.push({ type: "QUESTION_FORCED", questionId: m.negated[0].ask, triggerId: m.negated[0].id });
      if (!events.length) events.push({ type: "TEXT_UNMATCHED" });
      const ids = [...m.affirmative.map((a) => a.id), ...m.negated.map((n) => `¬${n.id}`)];
      return { events, human, summary: `text:${ids.join(",") || "unmatched"}` }; // raw text never leaves this function
    }

    case "tap": {
      const card = state.card;
      if (!card || card.instanceId !== input.cardInstanceId) {
        // INV-015: a stale tap is rejected — unless it is an emergency handoff, which is always honored.
        const old = state.cardHistory.find((c) => c.instanceId === input.cardInstanceId);
        const act = old?.actions.find((a) => a.id === input.actionId);
        if (act?.handoff?.target === "emergency") {
          return { events: [{ type: "HANDOFF_OPENED", channel: "tel", target: "emergency" }], human, summary: `tap:stale:${input.actionId}:honored` };
        }
        return { events: [], human, rejected: "STALE_CARD", summary: `tap:stale:${input.actionId}` };
      }
      const action = card.actions.find((a) => a.id === input.actionId);
      if (!action) return { events: [], human, rejected: "UNKNOWN_ACTION", summary: `tap:${input.actionId}:unknown` };

      if (card.kind === "question" && card.questionId) {
        const q = reg.question.get(card.questionId)!;
        const variant = variantFor(q, buildFacts(state, now, reg).facts);
        const ans = variant?.answers.find((a) => a.id === input.actionId);
        if (!ans) return { events: [], human, rejected: "UNKNOWN_ACTION", summary: `tap:${input.actionId}:no-answer` };
        return {
          events: [{ type: "SIGNALS_REPORTED", set: ans.set, source: "user_explicit", questionId: q.id, unknownAnswer: !!ans.unknown }],
          human,
          summary: `answer:${q.id}=${ans.id}`,
        };
      }
      const def = reg.card.get(card.cardId)?.actions?.find((a) => a.id === input.actionId);
      if (!def) return { events: [], human, rejected: "UNKNOWN_ACTION", summary: `tap:${input.actionId}:no-def` };
      const ctx = { skill: card.skill, strategy: card.strategy };
      return { events: def.ops.flatMap((op) => opToEvents(op, state, ctx)), human, summary: `tap:${card.cardId}.${input.actionId}` };
    }
  }
}

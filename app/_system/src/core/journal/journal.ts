/**
 * JOURNAL — event schema v2 (Blueprint v0.2 §4). PURE.
 * Derived from StepResult AFTER the card is decided (INV-019). Append-only, idempotent by eventId (INV-024),
 * two clocks (clientObservedAt now, serverReceivedAt later), provenance on every event (INV-022).
 * Payloads hold enums, ids, numbers — never free text (L17). `guardPayload` makes that structural.
 */
import type { JournalKind, Provenance, Band } from "../../generated/registry.gen";
import type { Reg } from "../registry";
import type { SessionState } from "../domain/state";
import type { RawInput } from "../domain/events";
import type { StepResult } from "../domain/decision";
import { provenanceOf, confidenceOf, type ConfidenceClass, type Actor } from "../domain/provenance";

export type JournalPrimitive = string | number | boolean | null;
export type JournalPayload = Record<string, JournalPrimitive>;
export type JournalOrigin = "self" | "helper" | "runtime" | "derived";

export interface JournalEvent {
  eventId: string;
  episodeId: string;
  clientSeq: number;
  clientObservedAt: number;
  serverReceivedAt: number | null;
  kind: JournalKind;
  origin: JournalOrigin;
  provenance: Provenance;
  confidenceClass: ConfidenceClass;
  payload: JournalPayload;
  schemaVersion: 2;
}

export interface Journal {
  episodeId: string;
  nextSeq: number;
  events: JournalEvent[];
}

export const JOURNAL_SCHEMA_VERSION = 2 as const;
const ID_LIKE = /^[A-Za-z0-9_.:¬|-]{1,64}$/;

export function emptyJournal(episodeId: string): Journal {
  return { episodeId, nextSeq: 1, events: [] };
}

/** Structural guarantee: a payload can only carry ids/enums/numbers. Free text cannot be journaled by accident. */
export function guardPayload(p: JournalPayload): JournalPayload {
  for (const [k, v] of Object.entries(p)) {
    if (typeof v === "string" && !ID_LIKE.test(v)) throw new Error(`journal: payload ${k} is not id-like (${v.length} chars)`);
  }
  return p;
}

/** Idempotent append: duplicates by eventId are ignored; clientSeq must be strictly increasing (INV-024). */
export function appendEvents(j: Journal, evs: JournalEvent[]): Journal {
  const seen = new Set(j.events.map((e) => e.eventId));
  const out = [...j.events];
  let next = j.nextSeq;
  for (const e of evs) {
    if (seen.has(e.eventId)) continue;
    if (e.clientSeq < next) throw new Error(`journal: seq ${e.clientSeq} < ${next} (append-only)`);
    seen.add(e.eventId);
    out.push(e);
    next = e.clientSeq + 1;
  }
  return { episodeId: j.episodeId, nextSeq: next, events: out };
}

/** Derive the journal events of ONE step. Pure. Does not mutate the journal; pair with appendEvents(). */
export function journalStep(j: Journal, prev: SessionState | null, r: StepResult, input: RawInput, reg: Reg): JournalEvent[] {
  const s = r.state;
  const at = s.lastAt;
  const actor = (s.signals.actor?.value ?? "unknown") as Actor;
  const humanOrigin: JournalOrigin = actor === "helper" ? "helper" : "self";
  const explicit: Provenance = actor === "helper" ? "helper_explicit" : "user_explicit";
  let seq = j.nextSeq;
  const out: JournalEvent[] = [];
  const push = (kind: JournalKind, origin: JournalOrigin, provenance: Provenance, confidenceClass: ConfidenceClass, payload: JournalPayload) => {
    out.push({
      eventId: `${j.episodeId}:${seq}`,
      episodeId: j.episodeId,
      clientSeq: seq++,
      clientObservedAt: at,
      serverReceivedAt: null,
      kind,
      origin,
      provenance,
      confidenceClass,
      payload: guardPayload(payload),
      schemaVersion: JOURNAL_SCHEMA_VERSION,
    });
  };

  if (input.kind === "boot") push("EPISODE_STARTED", "runtime", "runtime_observed", "explicit", {});

  const expiredByAction = new Set<string>();
  for (const ev of r.events) {
    switch (ev.type) {
      case "SIGNALS_REPORTED":
        for (const [signal, value] of Object.entries(ev.set)) {
          push("SIGNAL_REPORTED", ev.source === "derived_rule" ? "derived" : humanOrigin, provenanceOf(ev.source, actor), confidenceOf(ev.source), {
            signal,
            value,
            source: ev.source,
            questionId: ev.questionId ?? null,
            triggerId: ev.triggerId ?? null,
            unknownAnswer: !!ev.unknownAnswer,
          });
        }
        break;
      case "SIGNALS_EXPIRED":
        for (const signal of ev.signals) { expiredByAction.add(signal); push("SIGNAL_EXPIRED", humanOrigin, explicit, "explicit", { signal, reason: "action" }); }
        break;
      case "STRATEGY_OUTCOME":
        push("STRATEGY_OUTCOME", humanOrigin, explicit, "explicit", { skill: ev.skill, strategy: ev.strategy, outcome: ev.outcome });
        break;
      case "COMMITMENT_CREATED":
        push("COMMITMENT_CREATED", humanOrigin, explicit, "explicit", { kind: ev.kind });
        break;
      case "COMMITMENT_RESOLVED":
        push("COMMITMENT_RESOLVED", humanOrigin, explicit, "explicit", { kind: ev.kind, outcome: ev.outcome });
        break;
      case "HANDOFF_OPENED":
        push("HANDOFF_OPENED", humanOrigin, explicit, "explicit", { channel: ev.channel, target: ev.target });
        break;
      case "EMERGENCY_CALL_REPORTED":
        push("EMERGENCY_CALL_REPORTED", humanOrigin, explicit, "explicit", {});
        break;
      case "HELP_ON_SCENE":
        push("HELP_ON_SCENE", humanOrigin, explicit, "explicit", {});
        break;
      case "CORRECTION":
        push("CORRECTION", humanOrigin, explicit, "explicit", { ruleId: prev?.p0?.ruleId ?? null });
        break;
      case "QUESTION_FORCED":
        push("QUESTION_FORCED", humanOrigin, explicit, "derived", { questionId: ev.questionId, triggerId: ev.triggerId });
        break;
      case "TEXT_UNMATCHED":
        push("TEXT_UNMATCHED", humanOrigin, explicit, "unknown", {});
        break;
      case "APP_HIDDEN":
        push("APP_HIDDEN", "runtime", "runtime_observed", "explicit", {});
        break;
      case "APP_VISIBLE":
        push("APP_VISIBLE", "runtime", "runtime_observed", "explicit", { gapSec: prev && !prev.visibility.visible ? Math.round((at - prev.visibility.since) / 1000) : 0 });
        break;
      case "CONNECTIVITY":
        push("CONNECTIVITY", "runtime", "runtime_observed", "explicit", { online: ev.online });
        break;
      case "SESSION_END":
      case "WIPE":
        push("EPISODE_ENDED", humanOrigin, explicit, "explicit", { reason: ev.type === "WIPE" ? "wiped" : "ended" });
        break;
      case "SESSION_STARTED":
      case "TICK":
        break;
    }
  }

  if (prev) {
    for (const signal of Object.keys(prev.signals)) {
      if (!(signal in s.signals) && !expiredByAction.has(signal)) push("SIGNAL_EXPIRED", "runtime", "runtime_observed", "explicit", { signal, reason: "ttl" });
    }
  }

  const prevBand: Band | null = prev?.shownBand ?? null;
  if (s.shownBand && s.shownBand !== prevBand) {
    push("BAND_CHANGED", "derived", "derived", "derived", {
      from: prevBand,
      to: s.shownBand,
      commander: r.log.why.commander ?? null,
      bandRule: r.log.why.bandRule ?? null,
      reason: s.p0?.reason ?? null,
    });
  }

  const card = r.output.card;
  if (card.instanceId !== prev?.card?.instanceId) {
    push("CARD_SHOWN", "derived", "derived", "derived", {
      cardId: card.cardId,
      kind: card.kind,
      band: card.band,
      skill: card.skill,
      strategy: card.strategy,
      questionId: card.questionId ?? null,
      policyRule: r.log.why.policyRule ?? null,
    });
  }
  void reg;
  return out;
}

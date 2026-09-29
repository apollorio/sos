/**
 * PROCESS-EVENT — the heartbeat. One RawInput in, one StepResult out. PURE:
 * no clock (time comes in the input), no I/O, no randomness, no DOM. The shell persists
 * the returned state, renders output.card and sets ONE timer at output.nextWakeAt.
 *
 *   ingest → reduce → time (silence/visibility) → TTL expiry → decide → bookkeeping
 *          → invariants (fail-safe) → output (+ nextWakeAt) → structured log
 */
import { REG, type Reg } from "./registry";
import type { RawInput } from "./domain/events";
import type { SessionState } from "./domain/state";
import { initialState } from "./domain/state";
import type { CardView, Decision, Effect, LogEntry, Output, SkillPick, StepResult, Why } from "./domain/decision";
import type { Band, CardId } from "../generated/registry.gen";
import { REGISTRY_HASH } from "../generated/registry.gen";
import { ingest } from "./ingest/ingest";
import { reduce, opToEvents, type ReduceNotes } from "./state/reducer";
import { accrueSilence, nextSilenceDeadline, onHumanInput } from "./state/time";
import { expireSignals, nextSignalExpiry } from "./state/expiration";
import { nextCommitmentDue, pruneCommitments } from "./state/commitments";
import { checkInvariants } from "./state/invariants";
import { decide, pickKey } from "./planner/decide";
import { variantFor } from "./planner/voi";
import { chipsFor, REQUEST_TTL_MS } from "./planner/chips";
import { buildFacts } from "./logic/facts";
import { evaluate } from "./logic/predicate";
import type { DomainEvent } from "./domain/events";
import type { StrategyPriors } from "./continuity/types";

export const ENGINE_VERSION = "0.1.0";

export interface ProcessOptions {
  /** dev: invariant violations throw. prod: they render CARD_SAFE_FALLBACK. */
  mode?: "dev" | "prod";
  /** v0.2: longitudinal priors. Reorder eligible strategies only; never a fact (INV-020/021). */
  priors?: StrategyPriors;
}

export function startSession(sessionId: string, at: number, reg: Reg = REG, opts: ProcessOptions = {}): StepResult {
  return processEvent(initialState(sessionId, at), { kind: "boot", id: `boot:${sessionId}`, at, sessionId }, reg, opts);
}

export function processEvent(prev: SessionState, input: RawInput, reg: Reg = REG, opts: ProcessOptions = {}): StepResult {
  const mode = opts.mode ?? "dev";
  const s: SessionState = structuredClone(prev);
  const now = Math.max(input.at, s.lastAt); // monotonic guard against clock jumps
  s.lastAt = now;

  // Idempotency.
  const duplicate = s.seenInputIds.includes(input.id);
  s.seenInputIds = [...s.seenInputIds, input.id].slice(-50);

  const notes: ReduceNotes = { notes: [] };
  let rejected: StepResult["rejected"];
  let summary = "duplicate";
  let eventTypes: string[] = [];
  let events: DomainEvent[] = [];
  let explicitStep = false;
  let ingestNotice: Output["notice"];
  let helpedCard: string | null = null;

  if (duplicate) rejected = "DUPLICATE";
  else {
    // L25: the time an ACCEPTED answer took (visible time only) feeds the derived fact `pace`. Taps on help cards do not
    // count (doing an exercise for a minute is not hesitation), nor do rejected or stale taps.
    helpedCard = s.card && s.card.kind === "action" && (s.card.skill === "grounding" || s.card.skill === "care") ? s.card.instanceId : null;
    const answering = input.kind === "tap" && s.card?.kind === "question" && s.card.instanceId === input.cardInstanceId
      ? Math.max(0, now - Math.max(s.card.shownAt, s.visibility.since)) : null;
    const ing = ingest(s, input, now, reg);
    if (answering !== null && !ing.rejected) s.answerPace = [...(s.answerPace ?? []), { ms: answering, at: now }].slice(-5);
    summary = ing.summary;
    if (ing.rejected) rejected = ing.rejected;
    if (ing.human) {
      onHumanInput(s, now); // any tap proves presence, even a stale one
      // A forced question lives until the person has SEEN it and then done anything at all.
      if (s.forcedQuestion && s.card?.questionId === s.forcedQuestion) s.forcedQuestion = null;
    }
    explicitStep = ing.human && !ing.rejected;
    if (ing.notice) ingestNotice = ing.notice;
    for (const ev of ing.events) reduce(s, ev, now, reg, notes);
    eventTypes = ing.events.map((e) => e.type);
    events = ing.events;
  }

  if (notes.wiped) return terminal(s, "CARD_SESSION_CLOSED", now, reg, summary, eventTypes, events, [{ type: "WIPE_STORAGE" }], rejected);

  accrueSilence(s, now, reg);
  const expired = expireSignals(s, now);
  if (expired.length) notes.notes.push(`expired:${expired.join(",")}`);
  pruneCommitments(s, now);

  if (s.status !== "active") return terminal(s, "CARD_SESSION_CLOSED", now, reg, summary, eventTypes, events, [{ type: "KEEP_AWAKE", on: false }], rejected);

  const decision = decide(s, now, reg, explicitStep, opts.priors);
  const effects: Effect[] = [];
  const card = applyDecision(s, decision, now, reg, effects);

  const violations = checkInvariants(s, decision, card, now, reg);
  if (violations.length) {
    if (mode === "dev") throw new Error(`Invariant violation: ${violations.join(" | ")}`);
    return terminal(s, "CARD_SAFE_FALLBACK", now, reg, summary, eventTypes, events, [], rejected, violations);
  }

  effects.push({ type: "KEEP_AWAKE", on: decision.band === "P0" });
  // L22: silence on a help card brings presence, not a question. (HR-008 still watches silence when there is medical risk.)
  // L28: on a question, silence means thinking: say so, never hurry.
  const quiet = decision.band !== "P0" && s.silence.count >= 1;
  const presence = quiet ? (card.kind === "question" ? ("THINKING" as const) : PRESENCE_LINES[s.seq % PRESENCE_LINES.length]) : undefined;
  // A question asked again (its answer aged out, a safety re-check): say why, so it never feels like a jump.
  const recheck = card.kind === "question" && card.questionId && (s.questions[card.questionId]?.asks ?? 0) >= 2 ? ("RECHECK" as const) : undefined;
  // The live flows' voice (v1): after a "Fiz" on a technique or a care tip, one line of reassurance, rotating.
  const didIt = explicitStep && helpedCard !== null && input.kind === "tap" && input.cardInstanceId === helpedCard
    && events.some((e) => e.type === "STRATEGY_OUTCOME" && e.outcome === "done");
  const done = didIt ? AFTER_DONE[Object.values(s.strategies).filter((m) => m.doneAt != null).length % AFTER_DONE.length] : undefined;
  const notice = notes.notice ?? ingestNotice ?? (rejected === "STALE_CARD" ? ("STALE_TAP" as const) : presence ?? recheck ?? done);
  const finalFacts = buildFacts(s, now, reg).facts;
  const amb = reg.data.ambient.breath;
  const breath = decision.band !== "P0" && evaluate(amb.when, finalFacts).ok ? { inhaleSec: amb.inhaleSec, holdSec: amb.holdSec, exhaleSec: amb.exhaleSec } : null;
  const output: Output = {
    card,
    chips: decision.band === "P0" ? [] : chipsFor(s, finalFacts, decision.band, now, reg),
    ...(breath ? { breath } : {}),
    ...(notice ? { notice } : {}),
    effects,
    nextWakeAt: nextWakeAt(s, now, reg),
  };
  return { state: s, output, log: logEntry(s, now, summary, eventTypes, decision.band, decision.pick, decision.why, [], notes), events, ...(rejected ? { rejected } : {}) };
}

/** L22: quiet lines of presence, one per card (rotating by card, stable while the card stays). */
const PRESENCE_LINES = ["PRESENCE", "PRESENCE_WAVE", "PRESENCE_MINUTE"] as const;
/** After "Fiz" (audit 012, lines from the live v1 flows `torto`/`panico`). */
const AFTER_DONE = ["DONE_1", "DONE_2", "DONE_3", "DONE_4", "DONE_5"] as const;

/* ───────────────────────────── bookkeeping ───────────────────────────── */

function buildCardView(s: SessionState, pick: SkillPick, band: Band, now: number, reg: Reg, instanceId: string): CardView {
  const def = reg.card.get(pick.cardId);
  if (!def) throw new Error(`card ${pick.cardId} not in registry`);
  let actions: CardView["actions"];
  if (def.kind === "question") {
    const q = reg.question.get(pick.questionId!)!;
    const variant = variantFor(q, buildFacts(s, now, reg).facts)!;
    actions = variant.answers.map((a) => ({ id: a.id, emphasis: a.unknown ? ("low" as const) : ("secondary" as const), ...(a.unknown ? { unknown: true } : {}) }));
  } else {
    actions = (def.actions ?? []).map((a) => ({ id: a.id, emphasis: a.emphasis, ...(a.handoff ? { handoff: a.handoff } : {}) }));
  }
  return {
    instanceId,
    key: pickKey(pick),
    cardId: pick.cardId,
    kind: def.kind,
    band,
    skill: pick.skill,
    strategy: pick.strategy,
    ...(pick.questionId ? { questionId: pick.questionId } : {}),
    ...(pick.commitmentId ? { commitmentId: pick.commitmentId } : {}),
    variantKeys: pick.variantKeys,
    actions,
    ...(pick.interactive ? { interactive: pick.interactive } : {}),
  };
}

function applyDecision(s: SessionState, d: Decision, now: number, reg: Reg, effects: Effect[]): CardView {
  const key = pickKey(d.pick);
  // L28: the same card in another non-P0 band is still the same card (same instance: a tap in flight stays valid).
  const same = s.card !== null && s.card.key === key && (s.card.band === d.band || (s.card.band !== "P0" && d.band !== "P0"));
  if (same && s.card) s.card = { ...s.card, band: d.band };

  if (!same) {
    // New foreground card → new instance id (old taps become stale, INV-015).
    s.seq += 1;
    const view = buildCardView(s, d.pick, d.band, now, reg, `c${s.seq}`);
    if (s.card) s.cardHistory = [...s.cardHistory, stripShown(s.card)].slice(-5);
    s.card = { ...view, shownAt: now };
    s.silence.windowStart = now;

    if (d.pick.skill === "assess" && d.pick.questionId) {
      const mem = (s.questions[d.pick.questionId] ??= { asks: 0, lastAskedAt: null, lastUnknownAt: null });
      mem.asks += 1;
      mem.lastAskedAt = now;
      if (d.why.policyRule === "VOI_DECISIVE") s.questionsInARow += 1;
    } else {
      s.questionsInARow = 0;
      if (d.pick.strategy && d.pick.skill !== "emergency_escalation") {
        const skey = `${d.pick.skill}.${d.pick.strategy}`;
        const mem = (s.strategies[skey] ??= { doneAt: null, blockedUntil: null, shows: 0 });
        mem.shows += 1;
        s.repeat = s.repeat.key === skey ? { key: skey, count: s.repeat.count + 1 } : { key: skey, count: 1 };
      }
      const notes: ReduceNotes = { notes: [] };
      for (const op of d.pick.onShow) for (const ev of opToEvents(op, s, { skill: d.pick.skill, strategy: d.pick.strategy })) reduce(s, ev, now, reg, notes);
    }
    if (d.pick.cardId === "CARD_P0_BYSTANDER") effects.push({ type: "VIBRATE", pattern: [400, 200, 400, 200, 400] });
  }

  // Band / P0 bookkeeping.
  if (d.band === "P0") {
    const rule = reg.hardRule.get(d.why.commander!)!;
    s.p0 = { ruleId: rule.id, reason: rule.reason, since: s.p0?.since ?? now, latch: rule.latch || !!s.p0?.latch };
  } else {
    s.p0 = null;
    s.band = d.nextBand;
  }
  s.shownBand = d.band;
  return stripShown(s.card!);
}

function stripShown(c: CardView & { shownAt?: number }): CardView {
  const { shownAt: _drop, ...view } = c;
  void _drop;
  return view;
}

/** Earliest instant at which the decision could change with no new input (piecewise-constant guarantee). */
function nextWakeAt(s: SessionState, now: number, reg: Reg): number | null {
  const cands: (number | null)[] = [
    nextSilenceDeadline(s, reg),
    nextCommitmentDue(s, now),
    nextSignalExpiry(s, now),
  ];
  for (const [key, mem] of Object.entries(s.strategies)) {
    const st = reg.strategy.get(key);
    if (mem.blockedUntil != null && mem.blockedUntil > now) cands.push(mem.blockedUntil);
    if (st && mem.doneAt != null && mem.doneAt + st.cooldownSec * 1000 > now) cands.push(mem.doneAt + st.cooldownSec * 1000);
  }
  for (const [qid, mem] of Object.entries(s.questions)) {
    const q = reg.question.get(qid);
    if (q && mem?.lastUnknownAt != null && mem.lastUnknownAt + q.cooldownSec * 1000 > now) cands.push(mem.lastUnknownAt + q.cooldownSec * 1000);
    if (q?.minIntervalSec && mem?.lastAskedAt != null) cands.push(mem.lastAskedAt + q.minIntervalSec * 1000); // L24 boundary
  }
  for (const p of s.answerPace ?? []) cands.push(p.at + reg.data.pace.windowSec * 1000); // a sample leaves the pace window
  if (s.requested) cands.push(s.requested.at + REQUEST_TTL_MS + 1); // a menu pick stops being in force
  const future = cands.filter((x): x is number => x !== null && x > now);
  return future.length ? Math.min(...future) : null;
}

function terminal(
  s: SessionState,
  cardId: CardId,
  now: number,
  reg: Reg,
  summary: string,
  eventTypes: string[],
  events: DomainEvent[],
  effects: Effect[],
  rejected: StepResult["rejected"],
  violations: string[] = [],
): StepResult {
  const band: Band = s.shownBand ?? "P3";
  const def = reg.card.get(cardId)!;
  s.seq += 1;
  const view: CardView = {
    instanceId: `c${s.seq}`,
    key: `terminal|${cardId}`,
    cardId,
    kind: "action",
    band,
    skill: "terminal",
    strategy: null,
    variantKeys: ["default"],
    actions: (def.actions ?? []).map((a) => ({ id: a.id, emphasis: a.emphasis, ...(a.handoff ? { handoff: a.handoff } : {}) })),
  };
  if (s.card) s.cardHistory = [...s.cardHistory, stripShown(s.card)].slice(-5);
  s.card = { ...view, shownAt: now };
  const why: Why = { band, policyRule: "TERMINAL", because: [] };
  const pick: SkillPick = { skill: "steady_check", strategy: null, cardId, variantKeys: ["default"], onShow: [] };
  return {
    state: s,
    output: { card: view, chips: [], effects, nextWakeAt: null },
    log: logEntry(s, now, summary, eventTypes, band, { ...pick, skill: "steady_check" }, why, violations, { notes: [] }, "terminal"),
    events,
    ...(rejected ? { rejected } : {}),
  };
}

function logEntry(
  s: SessionState,
  now: number,
  input: string,
  events: string[],
  band: Band,
  pick: SkillPick,
  why: Why,
  violations: string[],
  notes: ReduceNotes,
  skillOverride?: string,
): LogEntry {
  return {
    seq: s.seq,
    at: now,
    input: notes.notes.length ? `${input} [${notes.notes.join(" ")}]` : input,
    events,
    band,
    skill: skillOverride ?? pick.skill,
    strategy: pick.strategy,
    cardId: pick.cardId,
    ...(pick.questionId ? { questionId: pick.questionId } : {}),
    why,
    violations,
    registry: REGISTRY_HASH,
    engine: ENGINE_VERSION,
  };
}

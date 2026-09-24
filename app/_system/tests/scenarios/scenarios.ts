/**
 * GOLDEN SCENARIOS — executable specification. Each scenario is a story from the brainstorm,
 * replayed through the real engine with a fake clock. `expect` pins what MUST happen.
 * Used by tests/scenarios/scenarios.test.ts and by `npm run simulate`.
 */
import { processEvent, startSession } from "../../src/core/process-event";
import type { RawInput } from "../../src/core/domain/events";
import type { StepResult } from "../../src/core/domain/decision";

type Expect = Partial<{ band: string; cardId: string; skill: string; strategy: string | null; questionId: string; rejected: string; notice: string; policyRule: string; commander: string }>;

export type Step =
  | { label?: string; answer: string; after?: number; expect?: Expect }
  | { label?: string; tap: string; after?: number; expect?: Expect }
  | { label?: string; tapOld: string; action: string; after?: number; expect?: Expect }
  | { label?: string; text: string; after?: number; expect?: Expect }
  | { label?: string; runtime: "APP_HIDDEN" | "APP_VISIBLE" | "ONLINE" | "OFFLINE" | "TICK"; after?: number; expect?: Expect }
  | { label?: string; shell: "call_192"; after?: number; expect?: Expect }
  | { label?: string; chip: string; after?: number; expect?: Expect };

export interface Scenario { name: string; doc: string; steps: Step[]; bootExpect?: Expect }

export const T0 = 1_800_000_000_000;

export interface Ran extends StepResult { label: string; failures: string[] }

export function runScenario(sc: Scenario): Ran[] {
  let t = T0;
  let n = 0;
  const first = startSession(`S-${sc.name}`, t);
  const out: Ran[] = [{ ...first, label: "boot", failures: check(first, sc.bootExpect) }];
  let r: StepResult = first;
  for (const step of sc.steps) {
    t += (step.after ?? 2) * 1000;
    const id = `i${++n}`;
    const card = r.state.card!;
    let input: RawInput;
    let label: string;
    if ("answer" in step) { input = { kind: "tap", id, at: t, cardInstanceId: card.instanceId, actionId: step.answer }; label = `answer ${step.answer}`; }
    else if ("tap" in step) { input = { kind: "tap", id, at: t, cardInstanceId: card.instanceId, actionId: step.tap }; label = `tap ${step.tap}`; }
    else if ("tapOld" in step) {
      const old = out.find((o) => o.label === step.tapOld);
      input = { kind: "tap", id, at: t, cardInstanceId: old?.output.card.instanceId ?? "?", actionId: step.action };
      label = `tap OLD(${step.tapOld}) ${step.action}`;
    }
    else if ("text" in step) { input = { kind: "text", id, at: t, text: step.text }; label = `text "${step.text}"`; }
    else if ("runtime" in step) { input = { kind: "runtime", id, at: t, event: step.runtime }; label = step.runtime === "TICK" ? `(+${step.after ?? 2}s) TICK` : step.runtime; }
    else if ("shell" in step) { input = { kind: "shell", id, at: t, action: step.shell }; label = "SHELL 192"; }
    else { input = { kind: "chip", id, at: t, chipId: step.chip }; label = `chip ${step.chip}`; }
    r = processEvent(r.state, input);
    out.push({ ...r, label: step.label ?? label, failures: check(r, step.expect) });
  }
  return out;
}

function check(r: StepResult, e?: Expect): string[] {
  if (!e) return [];
  const f: string[] = [];
  const c = r.output.card;
  const eq = (k: string, want: unknown, got: unknown) => { if (want !== undefined && want !== got) f.push(`${k}: want ${String(want)} got ${String(got)}`); };
  eq("band", e.band, r.log.band);
  eq("cardId", e.cardId, c.cardId);
  eq("skill", e.skill, c.skill);
  if ("strategy" in e) eq("strategy", e.strategy, c.strategy);
  eq("questionId", e.questionId, c.questionId);
  eq("rejected", e.rejected, r.rejected);
  eq("notice", e.notice, r.output.notice);
  eq("policyRule", e.policyRule, r.log.why.policyRule);
  eq("commander", e.commander, r.log.why.commander);
  return f;
}

/* ─────────────────────────────────────── the stories ─────────────────────────────────────── */

export const SCENARIOS: Scenario[] = [
  {
    name: "helper-unresponsive",
    doc: "Helper finds a friend who does not respond → P0 in 2 taps; background ≠ silence; bystander; handover.",
    bootExpect: { questionId: "Q_ACTOR" },
    steps: [
      { answer: "helper", expect: { questionId: "Q_RESPONDS", policyRule: "VOI_CRITICAL" } },
      { answer: "none", expect: { band: "P0", cardId: "CARD_P0_CALL", commander: "HR-001" } },
      { tap: "call_192", expect: { band: "P0", cardId: "CARD_P0_WAITING" } },
      { runtime: "APP_HIDDEN", after: 1 },
      { runtime: "TICK", after: 300, expect: { cardId: "CARD_P0_WAITING" } },
      { runtime: "APP_VISIBLE", after: 1, expect: { cardId: "CARD_P0_WAITING" } },
      { runtime: "TICK", after: 25, expect: { cardId: "CARD_P0_BYSTANDER" } },
      { tap: "im_here", expect: { cardId: "CARD_P0_WAITING" } },
      { tap: "help_arrived", expect: { cardId: "CARD_P0_HANDOVER" } },
      { tap: "end_session", expect: { cardId: "CARD_SESSION_CLOSED" } },
    ],
  },
  {
    name: "self-club-panic-loud",
    doc: "Brainstorm case A: panic + loud + with someone. Questions EMERGE from VOI (no form); budget caps them, then it acts.",
    steps: [
      { answer: "self", expect: { questionId: "Q_RED_FLAGS", policyRule: "VOI_CRITICAL" } },
      { answer: "none", expect: { questionId: "Q_CLARITY", policyRule: "VOI_DECISIVE" } },
      { answer: "yes", expect: { questionId: "Q_ANXIETY" } },
      { answer: "panic", expect: { band: "P2", questionId: "Q_COMPANY" } },
      { answer: "with", expect: { band: "P2", skill: "grounding", strategy: "breath_pacer" } },
      { tap: "done", after: 60, expect: { questionId: "Q_ANXIETY" } },
      { answer: "high", expect: { questionId: "Q_NOISE" } },
      { answer: "loud", expect: { band: "P2", skill: "reduce_stimulation", strategy: "relocate" } },
    ],
  },
  {
    name: "cant-move",
    doc: "L09: 'Não consigo' invalidates the STRATEGY (relocate → in_place → next grounding), never the person.",
    steps: [
      { answer: "self" }, { answer: "none" }, { answer: "yes" }, { answer: "panic" }, { answer: "with" },
      { tap: "done", after: 60 }, { answer: "high" },
      { answer: "loud", expect: { skill: "reduce_stimulation", strategy: "relocate" } },
      { tap: "cant_move", expect: { skill: "reduce_stimulation", strategy: "in_place" } },
      { tap: "didnt_help", expect: { skill: "grounding", strategy: "feet_floor" } },
    ],
  },
  {
    name: "self-alone-friend-coming",
    doc: "Brainstorm case B/C: alone + anxious → contact via native WhatsApp link; the runtime does not forget the friend.",
    steps: [
      { answer: "self" }, { answer: "none" }, { answer: "yes" }, { answer: "high" },
      { answer: "alone", expect: { band: "P1", skill: "contact_trusted_person", strategy: "message_whatsapp" } },
      { tap: "open_whatsapp" },
      { runtime: "APP_HIDDEN", after: 1 },
      { runtime: "APP_VISIBLE", after: 185, expect: { skill: "confirm_commitment", cardId: "CARD_CONFIRM_CONTACT", policyRule: "P1-005" } },
      { tap: "someone_coming", expect: { band: "P2", questionId: "Q_NOISE" } },
      { chip: "CHIP_FRIEND_ARRIVED", after: 240, expect: { band: "P3" } },
    ],
  },
  {
    name: "nobody-to-call",
    doc: "'Não tenho ninguém' blocks BOTH messaging strategies at once → CVV 188 (self only). Never a dead end.",
    steps: [
      { answer: "self" }, { answer: "none" }, { answer: "yes" }, { answer: "high" },
      { answer: "alone", expect: { strategy: "message_whatsapp" } },
      { tap: "nobody", expect: { skill: "contact_trusted_person", strategy: "crisis_line", cardId: "CARD_CRISIS_LINE" } },
    ],
  },
  {
    name: "grounding-rotation",
    doc: "Declining an exercise rotates to the next (decisive questions interleave); the fallback 'hold' is always there.",
    steps: [
      { answer: "self" }, { answer: "none" }, { answer: "yes" }, { answer: "panic" },
      { answer: "with", expect: { strategy: "breath_pacer" } },
      { tap: "not_this", expect: { questionId: "Q_NOISE" } },
      { answer: "quiet", expect: { strategy: "feet_floor" } },
      { tap: "not_this", expect: { strategy: "five_senses" } },
      { tap: "not_this", expect: { skill: "steady_check", strategy: "hold", policyRule: "P2-099" } },
    ],
  },
  {
    name: "background-is-not-silence",
    doc: "L06: 7 minutes in background produce NO silence; returning triggers a resume check-in instead.",
    steps: [
      { answer: "self" }, { answer: "none" }, { answer: "yes" }, { answer: "panic" },
      { answer: "with", expect: { skill: "grounding" } },
      { runtime: "APP_HIDDEN", after: 1 },
      { runtime: "TICK", after: 420 },
      { runtime: "APP_VISIBLE", after: 1, expect: { band: "P2", questionId: "Q_HOW_NOW", policyRule: "P2-010" } },
    ],
  },
  {
    name: "silence-after-medical-risk",
    doc: "HR-008: impaired person + 2 silent windows while VISIBLE → P0 bystander. A tap releases it (not latched).",
    steps: [
      { answer: "helper" },
      { answer: "little", expect: { band: "P1" } },
      { answer: "normal" },
      { answer: "none" },
      { runtime: "TICK", after: 61, expect: { questionId: "Q_HOW_NOW", policyRule: "P1-010" } },
      { runtime: "TICK", after: 61, expect: { band: "P0", commander: "HR-008", cardId: "CARD_P0_BYSTANDER" } },
      { tap: "im_here", expect: { band: "P1" } },
    ],
  },
  {
    name: "text-trigger-and-correction",
    doc: "Affirmative text acts immediately (P0); 'Me enganei' clears the latch and the fact is RE-ASKED.",
    steps: [
      { answer: "self" },
      { text: "Não consigo respirar!!", expect: { band: "P0", commander: "HR-002", cardId: "CARD_P0_CALL" } },
      { tap: "mistake", expect: { questionId: "Q_RED_FLAGS", policyRule: "VOI_CRITICAL" } },
    ],
  },
  {
    name: "negated-text-asks",
    doc: "Negated trigger ('não tô com dor no peito') never acts: it asks explicitly.",
    steps: [
      { answer: "self" }, { answer: "none" },
      { text: "nao estou com dor no peito", expect: { questionId: "Q_RED_FLAGS", policyRule: "FORCED_QUESTION" } },
    ],
  },
  {
    name: "latched-p0-survives-time",
    doc: "L03: 2 hours later, TTL has expired everything else, but the latched P0 is still in command.",
    steps: [
      { answer: "helper" },
      { answer: "none", expect: { band: "P0" } },
      { runtime: "APP_HIDDEN", after: 1 },
      { runtime: "TICK", after: 7200 },
      { runtime: "APP_VISIBLE", after: 1, expect: { band: "P0", commander: "HR-001", cardId: "CARD_P0_CALL" } },
    ],
  },
  {
    name: "stale-taps",
    doc: "INV-015: a stale answer is rejected; a stale tel:192 tap is ALWAYS honored.",
    steps: [
      { label: "p0-call", answer: "helper" },
      { answer: "none", label: "p0-card", expect: { cardId: "CARD_P0_CALL" } },
      { runtime: "TICK", after: 21, expect: { cardId: "CARD_P0_BYSTANDER" } },
      { tapOld: "p0-call", action: "self", expect: { rejected: "STALE_CARD", notice: "STALE_TAP" } },
      { tapOld: "p0-card", action: "call_192", expect: { band: "P0", cardId: "CARD_P0_WAITING" } },
    ],
  },
  {
    name: "shell-192-anytime",
    doc: "L12: tapping the static 192 bar from a calm state is respected → P0 waiting guidance.",
    steps: [
      { answer: "self" }, { answer: "none" },
      { shell: "call_192", expect: { band: "P0", commander: "HR-009", cardId: "CARD_P0_WAITING" } },
    ],
  },
  {
    name: "unmatched-text",
    doc: "v1 has no chat: unmatched text keeps the same card and shows a one-line notice.",
    steps: [
      { answer: "self" },
      { text: "oi, tudo bem?", expect: { questionId: "Q_RED_FLAGS", notice: "TEXT_UNMATCHED" } },
    ],
  },
];

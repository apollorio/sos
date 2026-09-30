/**
 * GOLDEN SCENARIOS — executable specification. Each scenario is a story from the brainstorm,
 * replayed through the real engine with a fake clock. `expect` pins what MUST happen.
 * Used by tests/scenarios/scenarios.test.ts and by `npm run simulate`.
 */
import { processEvent, startSession } from "../../src/core/process-event";
import type { RawInput } from "../../src/core/domain/events";
import type { StepResult } from "../../src/core/domain/decision";

type Expect = Partial<{ band: string; cardId: string; skill: string; strategy: string | null; questionId: string; rejected: string; notice: string; policyRule: string; commander: string; status: string }>;

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
  eq("status", e.status, r.state.status);
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
    doc: "Brainstorm case A, audits 010-011: panic + loud + with someone. A short triage, then help first (cold water); after that one question at most between two helps (L21), a care tip alternates with the techniques, and 'how are you' never comes back.",
    steps: [
      { answer: "self", expect: { questionId: "Q_RED_FLAGS", policyRule: "VOI_CRITICAL" } },
      { answer: "none", expect: { questionId: "Q_CLARITY", policyRule: "VOI_DECISIVE" } },
      { answer: "yes", expect: { questionId: "Q_ANXIETY" } },
      { answer: "panic", expect: { band: "P2", skill: "grounding", strategy: "cold_water" } },
      { tap: "done", after: 60, expect: { questionId: "Q_COMPANY" } },
      { answer: "with", expect: { band: "P2", skill: "care", strategy: "settle", policyRule: "P2-035" } },
      { tap: "done", after: 60, expect: { questionId: "Q_NOISE" } },
      { answer: "loud", expect: { band: "P2", skill: "reduce_stimulation", strategy: "relocate" } },
    ],
  },
  {
    name: "cant-move",
    doc: "L09: 'Não consigo' invalidates the STRATEGY (relocate → in_place → a technique), never the person.",
    steps: [
      { answer: "self" }, { answer: "none" }, { answer: "yes" }, { answer: "panic" },
      { tap: "done", after: 60 }, { answer: "with" }, { tap: "done", after: 60 },
      { answer: "loud", expect: { skill: "reduce_stimulation", strategy: "relocate" } },
      { tap: "cant_move", expect: { skill: "reduce_stimulation", strategy: "in_place" } },
      { tap: "didnt_help", expect: { skill: "grounding", strategy: "feet_floor" } },
    ],
  },
  {
    name: "self-alone-friend-coming",
    doc: "Brainstorm case B/C, audit 010: alone + anxious → a calming technique first, then contact via a native WhatsApp link; the runtime does not forget the friend.",
    steps: [
      { answer: "self" }, { answer: "none" }, { answer: "yes" },
      { answer: "high", expect: { skill: "grounding", strategy: "cold_water" } },
      { tap: "done", after: 60, expect: { questionId: "Q_COMPANY", notice: "DONE_2" } },
      { answer: "alone", expect: { band: "P1", skill: "contact_trusted_person", strategy: "message_whatsapp", policyRule: "P1-020" } },
      { tap: "open_whatsapp", expect: { questionId: "Q_FEEL" } },
      { runtime: "APP_HIDDEN", after: 1 },
      // L28 (audit 012): coming back 3 minutes later, the reply check is due, but the question on screen stays.
      { runtime: "APP_VISIBLE", after: 185, expect: { questionId: "Q_FEEL", policyRule: "KEEP_QUESTION" } },
      { answer: "none", after: 20, expect: { skill: "confirm_commitment", cardId: "CARD_CONFIRM_CONTACT", policyRule: "P1-005" } },
      { tap: "someone_coming", expect: { band: "P2" } },
      { chip: "CHIP_FRIEND_ARRIVED", after: 240, expect: { band: "P2" } },
    ],
  },
  {
    name: "nobody-to-call",
    doc: "'Não tenho ninguém' blocks BOTH messaging strategies at once → CVV 188 (self only). Never a dead end.",
    steps: [
      { answer: "self" }, { answer: "none" }, { answer: "yes" }, { answer: "high" },
      { tap: "done", after: 60 },
      { answer: "alone", expect: { strategy: "message_whatsapp" } },
      { tap: "nobody", expect: { skill: "contact_trusted_person", strategy: "crisis_line", cardId: "CARD_CRISIS_LINE" } },
    ],
  },
  {
    name: "calm-end-and-wipe",
    doc: "Stable person ends the session and erases it: 'Tô bem, encerrar' closes, 'Apagar agora' wipes storage (L20); the runtime then starts a fresh session.",
    steps: [
      { answer: "self" }, { answer: "none" }, { answer: "yes" },
      { answer: "low", expect: { band: "P3", cardId: "CARD_HOLD" } },
      { tap: "im_fine_end", expect: { cardId: "CARD_SESSION_CLOSED", status: "ended" } },
      { tap: "wipe", expect: { status: "wiped" } },
    ],
  },
  {
    name: "prefers-sms",
    doc: "Alone, after a first technique: 'Prefiro SMS' swaps WhatsApp for a native SMS link. No number is ever stored.",
    steps: [
      { answer: "self" }, { answer: "none" }, { answer: "yes" }, { answer: "high" },
      { tap: "done", after: 60 },
      { answer: "alone", expect: { strategy: "message_whatsapp" } },
      { tap: "use_sms", expect: { skill: "contact_trusted_person", strategy: "message_sms", cardId: "CARD_CONTACT_SMS" } },
    ],
  },
  {
    name: "grounding-rotation",
    doc: "Declining a technique rotates to the next one (one question may sit between two helps); once every technique was declined, care tips keep the help going (audit 011) and the fallback 'hold' is still there behind them.",
    steps: [
      { answer: "self" }, { answer: "none" }, { answer: "yes" },
      { answer: "panic", expect: { skill: "grounding", strategy: "cold_water" } },
      { tap: "not_this", expect: { questionId: "Q_COMPANY" } },
      { answer: "with", expect: { skill: "care", strategy: "settle", policyRule: "P2-035" } },
      { tap: "not_this", expect: { questionId: "Q_NOISE" } },
      { answer: "quiet", expect: { skill: "grounding", strategy: "feet_floor" } },
      { tap: "not_this", expect: { questionId: "Q_FEEL" } },
      { answer: "none", expect: { skill: "care", strategy: "sip_water" } },
      { tap: "not_this", expect: { skill: "grounding", strategy: "double_sigh" } },
      { tap: "not_this", expect: { skill: "care", strategy: "fresh_air" } },
      { tap: "not_this", expect: { skill: "grounding", strategy: "five_senses" } },
      { tap: "not_this", expect: { skill: "care", strategy: "eat_something" } },
      { tap: "not_this", expect: { skill: "grounding", strategy: "humming" } },
      { tap: "not_this", expect: { skill: "care", strategy: "brush_teeth" } },
      { tap: "not_this", expect: { skill: "grounding", strategy: "press_wall" } },
      { tap: "not_this", expect: { skill: "care", strategy: "cool_shower" } },
      { tap: "not_this", expect: { skill: "steady_check", strategy: "hold", policyRule: "P2-099" } },
    ],
  },
  {
    name: "pista-energia-bebida-remedio",
    doc: "Audit 014 (L30, studies/004): discovery like a friend. «Como tá o corpo agora?» → «E essa energia puxa pra quê?» → «E bebida, rolou hoje?» → «Tomou algum remédio hoje?» → «Tá batendo vontade de mais?». Never «o que você usou», never a substance name; each combination warning comes the moment it is described (never P0 by itself), a help always sits between two questions, and the care follows the body (cool down, one pill only, the urge is a wave, keep the rest out of sight).",
    steps: [
      { answer: "self" }, { answer: "none" }, { answer: "yes" },
      { answer: "panic", expect: { skill: "grounding", strategy: "cold_water" } },
      { tap: "done", after: 60, expect: { questionId: "Q_COMPANY" } },
      { answer: "with", expect: { skill: "care", strategy: "settle" } },
      { tap: "done", after: 60, expect: { questionId: "Q_NOISE" } },
      { answer: "quiet", expect: { skill: "grounding" } },
      { tap: "done", after: 60, expect: { questionId: "Q_FEEL" } },
      { answer: "racing", expect: { band: "P2", skill: "care", strategy: "cool_body" } },
      { tap: "done", after: 60, expect: { questionId: "Q_RACE_KIND" } },
      { answer: "people", expect: { skill: "grounding", strategy: "double_sigh" } },
      { tap: "done", after: 60, expect: { questionId: "Q_ALCOHOL" } },
      { answer: "yes", expect: { band: "P2", skill: "combination", strategy: "md_alcohol", cardId: "CARD_CARE_MIX_MD_ALCOHOL", policyRule: "P2-012" } },
      { tap: "ok", after: 60, expect: { questionId: "Q_MEDS" } },
      { answer: "erection", expect: { band: "P2", skill: "combination", strategy: "stim_sex", policyRule: "P2-012" } },
      { tap: "ok", after: 60, expect: { questionId: "Q_BODY" } },
      { answer: "heat", expect: { skill: "care", strategy: "pill_care" } },
      { tap: "done", after: 60, expect: { skill: "grounding" } },
      { tap: "done", after: 60, expect: { questionId: "Q_URGE" } },
      { answer: "strong", expect: { band: "P2", skill: "care", strategy: "urge_wave", cardId: "CARD_CARE_URGE" } },
      { tap: "done", after: 60, expect: { skill: "grounding" } },
      { tap: "done", after: 60, expect: { skill: "care", strategy: "put_away" } },
    ],
  },
  {
    name: "pista-despencou-bebida-helper",
    doc: "Audit 014, helper: a friend who «tava bem e do nada despencou», and drank. Heavy body → lying on the side comes first; the discriminator «Como foi ficando assim?» (answer: estava bem e despencou) brings «deixa o resto longe dela»; then «E bebida?» → two heavy things together raise the band to P1 (P1-012) with the warning addressed to the helper, then staying close. Never P0 by itself; nothing is named.",
    steps: [
      { answer: "helper" }, { answer: "normal" }, { answer: "normal" }, { answer: "none" },
      { answer: "anxious" }, { answer: "quiet" },
      { tap: "done", after: 60, expect: { questionId: "Q_FEEL", notice: "DONE_H2" } },
      { answer: "heavy", expect: { band: "P2", skill: "care", strategy: "side_safe" } },
      { tap: "done", after: 60, expect: { skill: "grounding", strategy: "feet_floor" } },
      { tap: "done", after: 60, expect: { questionId: "Q_HEAVY_KIND" } },
      { answer: "cliff", expect: { skill: "care", strategy: "put_away" } },
      { tap: "done", after: 60, expect: { questionId: "Q_ALCOHOL" } },
      { answer: "yes", expect: { band: "P1", skill: "combination", strategy: "downers", cardId: "CARD_CARE_MIX_DOWNERS", policyRule: "P1-012" } },
      { tap: "ok", after: 60, expect: { band: "P1", skill: "contact_trusted_person", strategy: "stay_close" } },
    ],
  },
  {
    name: "tontura-com-remedio-de-erecao",
    doc: "Audit 014: «Tontura e calor que vêm e passam rápido» (described, never named) → fresh air first; «Tomou algum remédio hoje?» comes next even when «E bebida?» would change nothing (no alcohol gate): an erection medicine with that quick dizziness is a dangerous drop in blood pressure → P1 and the warning at once, with the Disque-Intoxicação line one tap away. Never P0 by itself.",
    steps: [
      { answer: "self" }, { answer: "none" }, { answer: "yes" }, { answer: "high" },
      { tap: "done", after: 60 }, { answer: "with" }, { tap: "done", after: 60 }, { answer: "quiet" },
      { tap: "done", after: 60, expect: { questionId: "Q_FEEL" } },
      { answer: "strange", expect: { skill: "care", strategy: "ride_wave" } },
      { tap: "done", after: 60, expect: { skill: "grounding" } },
      { tap: "done", after: 60, expect: { questionId: "Q_STRANGE_KIND" } },
      { answer: "buzz", expect: { band: "P2", skill: "care", strategy: "inhalant_air" } },
      { tap: "done", after: 60, expect: { questionId: "Q_MEDS" } },
      { answer: "erection", expect: { band: "P1", skill: "combination", strategy: "poppers_pill", cardId: "CARD_CARE_MIX_POPPERS_PILL", policyRule: "P1-012" } },
      { tap: "ok", after: 60, expect: { band: "P1", questionId: "Q_BODY" } },
      { answer: "heat" },
    ],
  },
  {
    name: "body-chip-nose",
    doc: "Audit 011: the person says what hurts from the menu ('Nariz ardendo') whenever they want; it is acknowledged and its care tip (saline) comes next, without a question.",
    steps: [
      { answer: "self" }, { answer: "none" }, { answer: "yes" },
      { answer: "high", expect: { skill: "grounding", strategy: "cold_water" } },
      { chip: "CHIP_BODY_NOSE", expect: { skill: "care", strategy: "nose_rinse", policyRule: "USER_REQUEST", notice: "ACK_BODY" } },
      { chip: "CHIP_CARE_TEETH", expect: { skill: "care", strategy: "brush_teeth", policyRule: "USER_REQUEST" } },
    ],
  },
  {
    name: "slow-pace-asks-less",
    doc: "L25: a person who takes 90 s or more to answer each question gets no question between two helps (derived pace = slow): technique, care tip, technique… The pace never touches anxiety or the band.",
    steps: [
      { answer: "self", after: 95 }, { answer: "none", after: 95 }, { answer: "yes", after: 95 },
      { answer: "panic", after: 95, expect: { band: "P2", skill: "grounding", strategy: "cold_water" } },
      { tap: "done", after: 60, expect: { skill: "care", strategy: "settle" } },
      { tap: "done", after: 60, expect: { skill: "grounding", strategy: "feet_floor" } },
      { tap: "done", after: 60, expect: { band: "P2", skill: "care", strategy: "sip_water" } },
      { tap: "done", after: 60, expect: { skill: "grounding", strategy: "double_sigh" } },
      { tap: "done", after: 60, expect: { skill: "care", strategy: "fresh_air" } },
      { tap: "done", after: 60, expect: { skill: "grounding", strategy: "humming" } },
      { tap: "done", after: 60, expect: { skill: "care", strategy: "eat_something" } },
      { tap: "done", after: 60, expect: { skill: "grounding", strategy: "press_wall" } },
      { label: "10 min later the pace window has forgotten: one question may come back", tap: "done", after: 60, expect: { questionId: "Q_COMPANY" } },
      { answer: "with", after: 10, expect: { skill: "care", strategy: "brush_teeth" } },
      { tap: "done", after: 60, expect: { questionId: "Q_NOISE" } },
      { answer: "quiet", after: 10, expect: { skill: "grounding", strategy: "five_senses" } },
      { tap: "done", after: 60, expect: { questionId: "Q_FEEL" } },
      { answer: "none", after: 10, expect: { skill: "care", strategy: "cool_shower" } },
      { tap: "done", after: 60, expect: { skill: "grounding", strategy: "cold_water" } },
      { tap: "done", after: 60, expect: { skill: "care", strategy: "soft_music" } },
    ],
  },
  {
    name: "no-timer-jumps",
    doc: "L28 (audit 012, the owner's own path): self → 'Respiro bem' → 'Consigo' → 'Bastante' → 'Tô sozinho(a)' → WhatsApp → «Como tá o corpo agora?». Minutes spent thinking on a question never change the screen: no follow-up, no re-check, no expired answer replaces it, and the answer given after 8 minutes is accepted (never 'Essa tela já mudou').",
    steps: [
      { answer: "self", after: 20 }, { answer: "none", after: 30 }, { answer: "yes", after: 40 },
      { answer: "high", after: 60, expect: { skill: "grounding", strategy: "cold_water" } },
      { tap: "done", after: 90, expect: { questionId: "Q_COMPANY" } },
      { answer: "alone", after: 60, expect: { skill: "contact_trusted_person", strategy: "message_whatsapp" } },
      { tap: "open_whatsapp", after: 120, expect: { questionId: "Q_FEEL" } },
      { runtime: "TICK", after: 120, expect: { questionId: "Q_FEEL", policyRule: "KEEP_QUESTION", notice: "THINKING" } },
      { runtime: "TICK", after: 120, expect: { questionId: "Q_FEEL", policyRule: "KEEP_QUESTION" } },
      { runtime: "TICK", after: 120, expect: { questionId: "Q_FEEL", policyRule: "KEEP_QUESTION" } },
      { runtime: "TICK", after: 120, expect: { questionId: "Q_FEEL", policyRule: "KEEP_QUESTION" } },
      { answer: "racing", after: 5, expect: { skill: "confirm_commitment", cardId: "CARD_CONFIRM_CONTACT" } },
    ],
  },
  {
    name: "abnormal-breathing-no-pacer",
    doc: "INV-027 + L10 + L27: helper reports breathing 'strange' (abnormal, not P0) → no breathing exercise, no cold water, nothing by mouth and no breathing orb; helper-addressed grounding, then staying close.",
    steps: [
      { answer: "helper" }, { answer: "normal" }, { answer: "strange" }, { answer: "none" },
      { answer: "quiet", expect: { band: "P1", skill: "grounding", strategy: "feet_floor", policyRule: "P1-045" } },
      { tap: "not_this", expect: { skill: "contact_trusted_person", strategy: "stay_close", policyRule: "P1-032" } },
      { tap: "did_it", after: 60, expect: { questionId: "Q_FEEL" } },
      { answer: "none", expect: { skill: "care", strategy: "settle", policyRule: "P1-035" } },
      { tap: "done", after: 60, expect: { skill: "grounding", strategy: "five_senses" } },
    ],
  },
  {
    name: "impaired-no-five-senses",
    doc: "INV-027: thinking is 'hard' (impaired) → the first help is a simple physical technique (feet on the floor, then the wall); never five_senses, a breathing exercise or cold water.",
    steps: [
      { answer: "self" }, { answer: "none" },
      { answer: "hard", expect: { band: "P1", skill: "grounding", strategy: "feet_floor", policyRule: "P1-015" } },
      { tap: "not_this", expect: { skill: "grounding", strategy: "press_wall" } },
      { tap: "not_this", expect: { questionId: "Q_COMPANY" } },
    ],
  },
  {
    name: "helper-company-expiry",
    doc: "L10 + L28: 16 min into a rescue the helper's company=with_someone has expired (Q_COMPANY is self-only). The card stays while the helper is busy; the safety re-check comes with the next tap, saying it is a re-check. The helper keeps 'stay close' and is never offered the 'não tô muito bem' WhatsApp template.",
    steps: [
      { answer: "helper" }, { answer: "normal" }, { answer: "strange" }, { answer: "none" },
      { answer: "quiet", expect: { band: "P1", skill: "grounding", strategy: "feet_floor" } },
      { tap: "done", after: 60, expect: { band: "P1", skill: "contact_trusted_person", strategy: "stay_close", policyRule: "P1-032" } },
      // L28 (audit 012): 16 minutes on the card; nothing moves by itself (HR-008 would, if there were medical risk + silence).
      { runtime: "TICK", after: 960, expect: { skill: "contact_trusted_person", strategy: "stay_close", policyRule: "KEEP_HELP" } },
      { tap: "did_it", expect: { questionId: "Q_BREATHING", policyRule: "VOI_CRITICAL", notice: "RECHECK" } },
      { answer: "strange", expect: { questionId: "Q_RED_FLAGS", notice: "RECHECK" } },
      { answer: "none" },
    ],
  },
  {
    name: "silence-brings-presence",
    doc: "L22: minutes without a tap on a help card never bring 'Tudo bem por aí?'. The card stays, with a quiet 'Tô aqui com você. Sem pressa.'",
    steps: [
      { answer: "self" }, { answer: "none" }, { answer: "yes" },
      { answer: "panic", expect: { skill: "grounding", strategy: "cold_water" } },
      { runtime: "TICK", after: 185, expect: { cardId: "CARD_GROUNDING_COLD", policyRule: "KEEP_HELP", notice: "PRESENCE_MINUTE" } },
      { runtime: "TICK", after: 185, expect: { cardId: "CARD_GROUNDING_COLD", notice: "PRESENCE_MINUTE" } },
      { tap: "done", expect: { questionId: "Q_COMPANY" } },
    ],
  },
  {
    name: "menu-pick-and-blocks",
    doc: "L23: the menu is always there. 'Não tenho água aqui' takes cold water off it; a technique picked from it comes next; the only thing left to say is 'Tô bem, quero encerrar' (no better/worse grading, L29).",
    steps: [
      { answer: "self" }, { answer: "none" }, { answer: "yes" },
      { answer: "panic", expect: { strategy: "cold_water" } },
      { tap: "no_water", expect: { questionId: "Q_COMPANY" } },
      { chip: "CHIP_TOOL_COLD", expect: { rejected: "UNKNOWN_ACTION" } },
      { chip: "CHIP_TOOL_HUM", expect: { skill: "grounding", strategy: "humming", policyRule: "USER_REQUEST" } },
      { tap: "done", after: 30, expect: { questionId: "Q_COMPANY" } },
      { chip: "CHIP_REPORT_END", expect: { cardId: "CARD_SESSION_CLOSED", status: "ended" } },
    ],
  },
  {
    name: "menu-respects-contraindications",
    doc: "L23 + INV-027 + L10: a helper whose friend breathes strangely cannot pick a breathing exercise, cold water or the 'não tô muito bem' message from the menu; a safe pick waits behind the safety question.",
    steps: [
      { answer: "helper" }, { answer: "normal" },
      { answer: "strange", expect: { questionId: "Q_RED_FLAGS" } },
      { chip: "CHIP_TOOL_SIGH", expect: { rejected: "UNKNOWN_ACTION" } },
      { chip: "CHIP_TOOL_COLD", expect: { rejected: "UNKNOWN_ACTION" } },
      { chip: "CHIP_TALK_MESSAGE", expect: { rejected: "UNKNOWN_ACTION" } },
      { chip: "CHIP_TOOL_FEET", expect: { questionId: "Q_RED_FLAGS", policyRule: "VOI_CRITICAL" } },
      { answer: "none", expect: { skill: "grounding", strategy: "feet_floor", policyRule: "USER_REQUEST" } },
    ],
  },
  {
    name: "background-is-not-silence",
    doc: "L06 + L22: 7 minutes in background produce NO silence, and returning to a help card keeps it on screen (no check-in replaces it).",
    steps: [
      { answer: "self" }, { answer: "none" }, { answer: "yes" },
      { answer: "panic", expect: { skill: "grounding", strategy: "cold_water" } },
      { runtime: "APP_HIDDEN", after: 1 },
      { runtime: "TICK", after: 420 },
      { runtime: "APP_VISIBLE", after: 1, expect: { band: "P2", cardId: "CARD_GROUNDING_COLD", policyRule: "KEEP_HELP" } },
    ],
  },
  {
    name: "silence-after-medical-risk",
    doc: "HR-008: impaired person + 2 silent windows while VISIBLE → P0 bystander (no 'how are you' in between, L22). A tap releases it (not latched).",
    steps: [
      { answer: "helper" },
      { answer: "little", expect: { band: "P1" } },
      { answer: "normal" },
      { answer: "none" },
      { runtime: "TICK", after: 61, expect: { questionId: "Q_NOISE" } },
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

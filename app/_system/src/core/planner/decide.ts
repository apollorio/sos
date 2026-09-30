/**
 * DECIDE — pure function: (state, now) → exactly one Decision.
 *
 *   1. HARD RULES (ordered, first wins, latch)        → P0 → emergency_escalation. Nothing else runs.
 *   2. PREREQUISITE (actor unknown)                    → Q_ACTOR
 *   3. BAND (band rules + hysteresis)                  → P1 | P2 | P3
 *   4. FORCED QUESTION (negated text trigger)          → ask it
 *   5. VOI critical (an answer could reveal P0)        → ask it
 *   6. POLICY TABLE of the band (ordered, first match whose skill can act)
 *        · before acting, a DECISIVE question may go first (askBeforeAct + budget)
 *   7. The last rule of every table is always-eligible (lint INV-018) → total by construction.
 *
 * decideCore() is the same pipeline WITHOUT questions; the VOI engine uses it to simulate answers.
 */
import type { Reg } from "../registry";
import type { SessionState } from "../domain/state";
import type { Decision, SkillPick, Why } from "../domain/decision";
import type { Band, NonP0Band, PolicyRuleId, HardRuleId, BandRuleId, QuestionId } from "../../generated/registry.gen";
import { SKILLS } from "../skills";
import type { SkillCtx } from "../skills/skill";
import { buildFacts } from "../logic/facts";
import { evaluate, type Facts } from "../logic/predicate";
import { evaluateHardRules, type Commander } from "../safety/hard-rules";
import { determineBand, type BandOutcome } from "../safety/band-engine";
import { askable, rankQuestions, type CoreOutcome } from "./voi";
import { requestedPick } from "./chips";
import type { StrategyPriors } from "../continuity/types";

export class EngineError extends Error {}

export function pickKey(p: SkillPick): string {
  return [p.skill, p.strategy ?? "", p.cardId, p.questionId ?? "", p.commitmentId ?? "", p.variantKeys[0] ?? ""].join("|");
}

function p0Decision(state: SessionState, facts: Facts, cmd: Commander, now: number, reg: Reg): Decision {
  const ctx: SkillCtx = { state, facts, band: "P0", now, reg, commander: cmd };
  const pick = SKILLS.emergency_escalation.select(ctx);
  if (!pick) throw new EngineError("emergency_escalation returned null");
  return {
    band: "P0",
    pick,
    nextBand: state.band,
    why: {
      band: "P0",
      commander: cmd.rule.id as HardRuleId,
      because: cmd.because,
      ...(cmd.alsoMatching.length ? { alsoMatchingHardRules: cmd.alsoMatching } : {}),
    },
  };
}

function assessPick(ctx: SkillCtx, questionId: string): SkillPick | null {
  return SKILLS.assess.select({ ...ctx, questionId });
}

function prerequisite(facts: Facts, reg: Reg): QuestionId | null {
  for (const q of reg.data.questions) {
    if (!q.prerequisite) continue;
    const sigs = Object.values(q.variants).flatMap((v) => v.answers.flatMap((a) => Object.keys(a.set)));
    if (sigs.some((s) => (facts[`signal.${s}`] ?? "unknown") === "unknown")) return q.id as QuestionId;
  }
  return null;
}

/**
 * L28 (audit 012): only the person moves the screen. On a step without human input (a timer, an answer ageing out, a
 * commitment falling due, returning to the app) the card on screen stays, question or help, exactly as it is. Re-checks
 * and follow-ups wait for the next tap. The one exception is P0, decided above this point.
 */
function keepCard(ctx: SkillCtx): SkillPick | null {
  const c = ctx.state.card;
  if (!c || c.band === "P0" || c.skill === "emergency_escalation" || c.skill === "terminal") return null;
  return {
    skill: c.skill as SkillPick["skill"],
    strategy: c.strategy,
    cardId: c.cardId,
    variantKeys: c.variantKeys,
    onShow: [],
    ...(c.questionId ? { questionId: c.questionId } : {}),
    ...(c.commitmentId ? { commitmentId: c.commitmentId } : {}),
    ...(c.interactive ? { interactive: c.interactive } : {}),
  };
}

/** Pipeline without questions (used by VOI simulation and by the exhaustive tests). */
export function decideCore(state: SessionState, now: number, reg: Reg, explicit = true, priors?: StrategyPriors): CoreOutcome & { decision: Decision } {
  const { facts } = buildFacts(state, now, reg);
  const cmd = evaluateHardRules(state, facts, reg);
  if (cmd) {
    const d = p0Decision(state, facts, cmd, now, reg);
    return { band: "P0", key: pickKey(d.pick), decision: d };
  }
  const bo = determineBand(state.band, facts, now, reg, explicit);
  const band = bo.next.current;
  const ctx: SkillCtx = { state, facts, band, now, reg, ...(priors ? { priors } : {}) };
  for (const rule of reg.data.policies[band] ?? []) {
    if (rule.skill === "assess") continue;
    const ev = evaluate(rule.when, facts);
    if (!ev.ok) continue;
    const pick = SKILLS[rule.skill as keyof typeof SKILLS].select(ctx);
    if (!pick) continue;
    const d: Decision = { band, pick, nextBand: bo.next, why: whyFor(band, bo, rule.id as PolicyRuleId, ev.because) };
    return { band, key: pickKey(pick), decision: d };
  }
  throw new EngineError(`policy table ${band} is not total`);
}

function whyFor(band: Band, bo: BandOutcome, policyRule: Why["policyRule"], because: Why["because"]): Why {
  return {
    band,
    bandRule: bo.ruleId as BandRuleId,
    ...(bo.held ? { heldByHysteresis: true } : {}),
    ...(policyRule ? { policyRule } : {}),
    because,
    bandBecause: bo.because,
  };
}

/** Full decision (with the question layer). `explicit` = this step carries a human input. */
export function decide(state: SessionState, now: number, reg: Reg, explicit = false, priors?: StrategyPriors): Decision {
  const { facts } = buildFacts(state, now, reg);

  // 1. P0 — executes, never asks (L05, INV-017).
  const cmd = evaluateHardRules(state, facts, reg);
  if (cmd) return p0Decision(state, facts, cmd, now, reg);

  // 3. Band (computed before the prerequisite so even the first card has an honest band).
  const bo = determineBand(state.band, facts, now, reg, explicit);
  const band: NonP0Band = bo.next.current;
  const ctx: SkillCtx = { state, facts, band, now, reg, ...(priors ? { priors } : {}) };
  const asQuestion = (qid: string, policyRule: Why["policyRule"], cls?: "critical" | "decisive"): Decision | null => {
    const pick = assessPick(ctx, qid);
    if (!pick) return null;
    const leaf = { path: `question.${qid}`, op: cls ?? "asked", expected: null, actual: null };
    return {
      band,
      pick,
      nextBand: bo.next,
      why: { ...whyFor(band, bo, policyRule, [leaf]), ...(cls ? { voi: { questionId: qid as QuestionId, class: cls } } : {}) },
    };
  };

  // L22: time alone never takes a help card off the screen. Only a human input, P0 (above), a lost
  // contraindication (the strategy is no longer eligible) or a safety re-check while someone is being watched
  // (below) can replace it: no check-in or follow-up interrupts an exercise on a timer; they come after the next tap.
  const keep = explicit ? null : keepCard(ctx);
  const keepWhy = () => whyFor(band, bo, keep?.questionId ? "KEEP_QUESTION" : "KEEP_HELP", [{ path: `card.${state.card!.cardId}`, op: "keep", expected: null, actual: null }]);

  // 2. Prerequisite: who is holding the phone.
  const pre = keep ? null : prerequisite(facts, reg);
  if (pre) {
    const d = asQuestion(pre, "PREREQUISITE");
    if (d) return d;
  }

  // 4. Forced question (a negated text trigger asks instead of acting).
  if (state.forcedQuestion) {
    const q = reg.question.get(state.forcedQuestion);
    if (q && askable(q, state, facts, band, now, reg, true)) {
      const d = asQuestion(q.id, "FORCED_QUESTION");
      if (d) return d;
    }
  }

  // 5. VOI.
  const base = decideCore(state, now, reg, explicit, priors);
  // Simulated answers ARE explicit human inputs, so they may release hysteresis.
  const ranked = rankQuestions(state, facts, band, base, now, reg, (s, t, r) => decideCore(s, t, r, true, priors));
  const top = ranked[0];
  // A question that could reveal P0 waits for the next tap too (L28); a real emergency on a timer is a hard rule (HR-008).
  if (top?.cls === "critical" && !keep) {
    const d = asQuestion(top.q.id, "VOI_CRITICAL", "critical");
    if (d) return d;
  }
  if (keep) return { band, pick: keep, nextBand: bo.next, why: keepWhy() };
  // 5b. The person picked a technique from the menu (L23). Only P0 and a critical question come first;
  // their choice is never displaced by a decisive question or a policy rule.
  const req = requestedPick(state, facts, band, now, reg);
  if (req) {
    const leaf = { path: `requested.${state.requested!.key}`, op: "picked", expected: null, actual: null };
    return { band, pick: req, nextBand: bo.next, why: whyFor(band, bo, "USER_REQUEST", [leaf]) };
  }

  const eng = reg.data.engagement[band]!;
  const decisive = ranked.find((r) => r.cls === "decisive");
  // The question already on screen does not consume budget again (stable card identity):
  // re-deciding without new input must never make the current question disappear.
  // L21: a short triage on entry (questionBudget); once help has started, at most questionsBetweenHelps between two helps.
  const helped = Object.values(state.strategies).some((m) => m.shows > 0);
  // L25: a slow pace (derived from answer times, never reported) means fewer questions, never more.
  // …unless the only help left is the bare fallback: then one answer is worth more than another "Tô aqui".
  const onlyFallback = base.decision.pick.skill === "steady_check" && base.decision.pick.strategy === "hold";
  const slow = facts["pace"] === "slow" && eng.slowQuestionsBetweenHelps !== undefined && !onlyFallback;
  const between = eng.questionsBetweenHelps ?? eng.questionBudget;
  const budget = helped ? (slow ? Math.min(between, eng.slowQuestionsBetweenHelps!) : between) : eng.questionBudget;
  const budgetOk = !!decisive && (state.questionsInARow < budget || state.card?.questionId === decisive.q.id);

  // 6. Policy table.
  for (const rule of reg.data.policies[band] ?? []) {
    const ev = evaluate(rule.when, facts);
    if (!ev.ok) continue;
    if (rule.skill === "assess") {
      const pinned = rule.question;
      const qid = pinned ?? (decisive && budgetOk ? decisive.q.id : null);
      if (!qid) continue;
      const q = reg.question.get(qid);
      if (!q || !askable(q, state, facts, band, now, reg, !!pinned)) continue;
      const pick = assessPick(ctx, qid);
      if (!pick) continue;
      return { band, pick, nextBand: bo.next, why: whyFor(band, bo, rule.id as PolicyRuleId, ev.because) };
    }
    const pick = SKILLS[rule.skill as keyof typeof SKILLS].select(ctx);
    if (!pick) continue;
    // Never interrupt an intervention that is already on screen with a non-critical question.
    const alreadyShowing = state.card?.kind === "action" && state.card.key === pickKey(pick);
    if (eng.askBeforeAct && budgetOk && decisive && !alreadyShowing && pick.skill !== "confirm_commitment") {
      const d = asQuestion(decisive.q.id, "VOI_DECISIVE", "decisive");
      if (d) return d;
    }
    return { band, pick, nextBand: bo.next, why: whyFor(band, bo, rule.id as PolicyRuleId, ev.because) };
  }
  throw new EngineError(`policy table ${band} is not total`);
}

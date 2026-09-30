/**
 * Facts = the flat, read-only projection of state that predicates see.
 * The fact catalog (paths + domains) is derived from the registry, so the linter can
 * validate every predicate against exactly what the engine will provide.
 */
import type { Reg } from "../registry";
import type { SessionState } from "../domain/state";
import type { Primitive } from "../domain/signals";
import type { Facts } from "./predicate";
import { computeRisk, type RiskVector } from "../safety/risk-vector";

export function signalValue(state: SessionState, id: string, now: number): Primitive {
  const rec = (state.signals as Record<string, { value: Primitive; expiresAt: number | null } | undefined>)[id];
  if (!rec) return "unknown";
  if (rec.expiresAt !== null && rec.expiresAt <= now) return "unknown";
  return rec.value;
}

export function trendOf(state: SessionState, now: number): "improving" | "stable" | "worsening" | "unknown" {
  const reported = signalValue(state, "reportedTrend", now);
  if (reported === "worse") return "worsening";
  if (reported === "better") return "improving";
  const h = state.anxietyHistory;
  if (h.length >= 2) {
    const a = h[h.length - 2]!.value;
    const b = h[h.length - 1]!.value;
    return b > a ? "worsening" : b < a ? "improving" : "stable";
  }
  return reported === "same" ? "stable" : "unknown";
}

/** Skills whose cards count as "a help" for the alternation of techniques and care tips (help.last). */
const HELP_SKILLS = new Set(["grounding", "care", "combination", "steady_check"]);

/** The last help on screen (current card first, then history): what the loop alternates away from. */
export function lastHelp(state: SessionState): string {
  const cards = [state.card, ...[...state.cardHistory].reverse()];
  for (const c of cards) if (c && c.kind === "action" && HELP_SKILLS.has(c.skill)) return c.skill;
  return "none";
}

/**
 * L25 — pace: how long the person takes to answer a question (visible time), over the recent window.
 * Derived, never reported (L15): it can make the app ask less and offer simpler things first; it never becomes
 * anxiety, never raises a band and never diagnoses (L16).
 */
export function paceOf(state: SessionState, now: number, reg: Reg): "quick" | "steady" | "slow" | "unknown" {
  const cfg = reg.data.pace;
  const recent = (state.answerPace ?? []).filter((p) => now - p.at < cfg.windowSec * 1000).slice(-cfg.minSamples);
  if (recent.length < cfg.minSamples) return "unknown";
  if (recent.every((p) => p.ms >= cfg.slowSec * 1000)) return "slow";
  if (recent.every((p) => p.ms <= cfg.quickSec * 1000)) return "quick";
  return "steady";
}

export interface FactsWithRisk {
  facts: Facts;
  risk: RiskVector;
}

export function buildFacts(state: SessionState, now: number, reg: Reg): FactsWithRisk {
  const f: Record<string, Primitive> = {};
  for (const s of reg.data.signals) f[`signal.${s.id}`] = signalValue(state, s.id, now);
  f["trend"] = trendOf(state, now);
  f["connectivity"] = state.connectivity;
  f["silence.count"] = Math.min(state.silence.count, reg.data.silence.maxCount);
  f["session.resumedAfterGap"] = state.flags.resumedAfterGap;
  f["session.emergencyEngaged"] = state.flags.emergencyEngaged;
  f["session.helpOnScene"] = state.flags.helpOnScene;
  let due = false;
  for (const c of reg.data.commitments) f[`commitment.pending.${c.id}`] = false;
  for (const c of state.commitments) {
    if (c.status !== "pending") continue;
    f[`commitment.pending.${c.kind}`] = true;
    if (c.dueAt <= now) due = true;
  }
  f["commitment.due"] = due;
  // question.<id>.asked: the conversation's own order (Akinator: "which one?" before "with alcohol?").
  for (const q of reg.data.questions) f[`question.${q.id}.asked`] = (state.questions[q.id as keyof typeof state.questions]?.asks ?? 0) > 0;
  f["help.last"] = lastHelp(state);
  f["pace"] = paceOf(state, now, reg);
  // skill.<id>.done: this skill already helped in this session (L21: the first help is a technique, then the rest).
  for (const sk of reg.data.skills) {
    if (!sk.strategies.length) continue;
    f[`skill.${sk.id}.done`] = sk.strategies.some((st) => state.strategies[`${sk.id}.${st.id}`]?.doneAt != null);
  }
  const risk = computeRisk(f, reg);
  for (const [d, lvl] of Object.entries(risk)) f[`risk.${d}`] = lvl;
  return { facts: f, risk };
}

/** Catalog of every fact path and its domain (used by the linter and the exhaustive tests). */
export function factCatalog(reg: Reg): Map<string, Primitive[]> {
  const m = new Map<string, Primitive[]>();
  for (const s of reg.data.signals) m.set(`signal.${s.id}`, s.domain);
  for (const f of reg.data.facts) m.set(f.path, f.domain);
  for (const d of reg.data.risk.dimensions) m.set(`risk.${d}`, [0, 1, 2, 3, 4]);
  for (const c of reg.data.commitments) m.set(`commitment.pending.${c.id}`, [true, false]);
  for (const sk of reg.data.skills) if (sk.strategies.length) m.set(`skill.${sk.id}.done`, [true, false]);
  for (const q of reg.data.questions) m.set(`question.${q.id}.asked`, [true, false]);
  return m;
}

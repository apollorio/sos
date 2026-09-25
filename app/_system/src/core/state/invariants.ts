/**
 * RUNTIME INVARIANTS — checked after every step.
 * dev/test: a violation THROWS (bugs surface immediately).
 * prod:     a violation renders CARD_SAFE_FALLBACK (tel:192 + restart) — fail-safe, never fail-silent.
 * The same invariants are proven offline over the whole abstract state space (tests/exhaustive).
 */
import type { Reg } from "../registry";
import type { SessionState } from "../domain/state";
import type { CardView, Decision } from "../domain/decision";
import { buildFacts } from "../logic/facts";

export function checkInvariants(state: SessionState, decision: Decision, card: CardView, now: number, reg: Reg): string[] {
  const v: string[] = [];
  const { facts } = buildFacts(state, now, reg);
  const { pick, band } = decision;

  if (band === "P0" && pick.skill !== "emergency_escalation") v.push("INV-001 P0 without emergency_escalation");
  if (band === "P0" && pick.skill === "assess") v.push("INV-017 P0 asked a question");
  if (facts["signal.companion"] === "arrived" && facts["signal.company"] === "alone") v.push("INV-004 arrived ∧ alone");

  if (pick.strategy && pick.skill !== "emergency_escalation" && pick.skill !== "confirm_commitment") {
    const key = `${pick.skill}.${pick.strategy}`;
    const st = reg.strategy.get(key);
    const mem = state.strategies[key];
    if (st && !st.alwaysEligible && mem?.blockedUntil != null && mem.blockedUntil > now) v.push(`INV-005 blocked strategy ${key}`);
    if (st && facts["signal.physicallyUnsafe"] === "yes" && st.requires.some((r) => r === "movement" || r === "safe_location")) {
      v.push(`INV-006 unsafe ∧ ${key}`);
    }
    if (pick.skill === "grounding" && pick.strategy === "breath_pacer" && (facts["signal.breathing"] !== "normal" || facts["signal.responsiveness"] !== "responsive")) v.push(`INV-027 breath_pacer with breathing=${String(facts["signal.breathing"])} responsiveness=${String(facts["signal.responsiveness"])}`);
    if (pick.skill === "grounding" && pick.strategy === "five_senses" && facts["signal.responsiveness"] !== "responsive") v.push(`INV-027 five_senses with responsiveness=${String(facts["signal.responsiveness"])}`);
  }

  const eng = reg.data.engagement[band];
  if (eng) {
    const low = card.actions.filter((a) => a.emphasis === "low").length;
    if (card.kind === "action") {
      const main = card.actions.length - low;
      if (main > eng.maxActions) v.push(`INV-008 ${card.cardId} has ${main} actions > ${eng.maxActions} in ${band}`);
      if (low > eng.maxLowEmphasis) v.push(`INV-008 ${card.cardId} has ${low} low-emphasis actions`);
    } else {
      const answers = card.actions.filter((a) => !a.unknown).length;
      if (band !== "P0" && answers > eng.maxAnswers) v.push(`INV-008 ${card.cardId} has ${answers} answers > ${eng.maxAnswers} in ${band}`);
    }
  }

  const sub = (state.signals as Record<string, { source: string } | undefined>)["substanceClass"];
  if (sub && sub.source !== "user_explicit") v.push("INV-012 substanceClass not explicit");

  for (const [qid, mem] of Object.entries(state.questions)) {
    const q = reg.question.get(qid);
    if (q && mem && mem.asks > q.maxAsks) v.push(`INV-009 ${qid} asked ${mem.asks} > ${q.maxAsks}`);
  }
  return v;
}

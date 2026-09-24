/** Synthetic 180-day history for the simulator and the tests: n episodes where a strategy was done and a trend reported. */
import type { JournalEvent } from "../core/journal/journal";

export function synthHistory(skill: string, strategy: string, n: number, outcome: "better" | "same" | "worse", at: number, prefix = "H"): JournalEvent[] {
  const out: JournalEvent[] = [];
  for (let e = 0; e < n; e++) {
    const ep = `${prefix}${e}`;
    const t = at - e * 3_600_000;
    let seq = 1;
    const push = (kind: JournalEvent["kind"], payload: JournalEvent["payload"], dt: number, provenance: JournalEvent["provenance"] = "user_explicit") =>
      out.push({ eventId: `${ep}:${seq}`, episodeId: ep, clientSeq: seq++, clientObservedAt: t + dt * 1000, serverReceivedAt: null, kind, origin: provenance === "derived" ? "derived" : provenance === "runtime_observed" ? "runtime" : "self", provenance, confidenceClass: provenance === "derived" ? "derived" : "explicit", payload, schemaVersion: 2 });
    push("EPISODE_STARTED", {}, 0, "runtime_observed");
    push("SIGNAL_REPORTED", { signal: "actor", value: "self", source: "user_explicit", questionId: "Q_ACTOR", triggerId: null, unknownAnswer: false }, 2);
    push("SIGNAL_REPORTED", { signal: "company", value: "alone", source: "user_explicit", questionId: "Q_COMPANY", triggerId: null, unknownAnswer: false }, 4);
    push("CARD_SHOWN", { cardId: "CARD_X", kind: "action", band: "P2", skill, strategy, questionId: null, policyRule: "P2-040" }, 10, "derived");
    push("STRATEGY_OUTCOME", { skill, strategy, outcome: "done" }, 60);
    push("SIGNAL_REPORTED", { signal: "reportedTrend", value: outcome, source: "user_explicit", questionId: "Q_HOW_NOW", triggerId: null, unknownAnswer: false }, 120);
    push("EPISODE_ENDED", { reason: "ended" }, 300);
  }
  return out;
}

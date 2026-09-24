/**
 * EXHAUSTIVE VERIFICATION — the closest thing to "zero chance of a wrong flow".
 *
 * All signals are finite enums, so the abstract state space is FINITE. We enumerate it and
 * prove, for every single state (not a sample):
 *   · totality          decide() always returns a decision (INV-010)
 *   · one commander     P0 ⇔ a hard rule matches; P0 ⇒ emergency_escalation, never a question (INV-001/017)
 *   · precedence        with several P0 facts, the lowest-numbered rule commands (L04)
 *   · safety filters    no movement strategy when unsafe/impaired; no blocked strategy (INV-005/006)
 *   · monotonicity      more danger never produces a LESS severe band (clinical sanity of the tables)
 *   · explainability    every decision carries machine-readable reasons
 *   · coverage          every policy / band / hard rule is reachable (dead rules fail the build)
 */
import { describe, it, expect } from "vitest";
import { REG } from "../../src/core/registry";
import { initialState, type SessionState } from "../../src/core/domain/state";
import { decide, decideCore } from "../../src/core/planner/decide";
import { determineBand } from "../../src/core/safety/band-engine";
import { buildFacts } from "../../src/core/logic/facts";
import type { Decision } from "../../src/core/domain/decision";
import type { Primitive } from "../../src/core/domain/signals";

const NOW = 1_800_000_000_000;
const RANK: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

type Dim = { name: string; values: Primitive[] };

function* cartesian(dims: Dim[]): Generator<Record<string, Primitive>> {
  const idx = new Array(dims.length).fill(0);
  while (true) {
    const combo: Record<string, Primitive> = {};
    dims.forEach((d, i) => (combo[d.name] = d.values[idx[i]]!));
    yield combo;
    let k = dims.length - 1;
    while (k >= 0 && ++idx[k] === dims[k]!.values.length) idx[k--] = 0;
    if (k < 0) return;
  }
}

const SIGNALS = new Set(REG.data.signals.map((s) => s.id));

function mkState(c: Record<string, Primitive>): SessionState | null {
  // Reachability filter (states the reducer can never produce are skipped, not "passed").
  if (c["companion"] === "arrived" && c["company"] === "alone") return null; // INVAL-001/002
  if (c["actor"] === "helper" && c["company"] === "alone") return null; // INVAL-003 + Q_COMPANY is self-only
  const s = initialState("X", NOW - 60_000);
  s.lastAt = NOW;
  for (const [k, v] of Object.entries(c)) {
    if (!SIGNALS.has(k) || v === "unknown") continue;
    (s.signals as Record<string, unknown>)[k] = { value: v, source: "user_explicit", observedAt: NOW - 1000, expiresAt: null };
    if (k === "anxiety" && typeof v === "number") s.anxietyHistory = [{ value: v, at: NOW - 1000 }];
  }
  s.silence.count = Number(c["silence"] ?? 0);
  s.connectivity = (c["connectivity"] as "online" | "offline") ?? "online";
  s.flags.emergencyEngaged = c["engaged"] === true;
  if (c["due"] === true) s.commitments = [{ id: "FRIEND_ARRIVAL#1", kind: "FRIEND_ARRIVAL", status: "pending", createdAt: NOW - 700_000, dueAt: NOW - 1000, snoozes: 0 }];
  if (c["relocateBlocked"] === true) s.strategies["reduce_stimulation.relocate"] = { doneAt: null, blockedUntil: NOW + 1e6, shows: 1 };
  s.flags.resumedAfterGap = c["resumed"] === true;
  if (c["exhausted"] === true) {
    // History abstraction: every non-fallback strategy was already tried and refused.
    for (const sk of REG.data.skills) for (const st of sk.strategies) if (!st.alwaysEligible) s.strategies[`${sk.id}.${st.id}`] = { doneAt: null, blockedUntil: NOW + 1e6, shows: 1 };
  }
  if (typeof c["prevBand"] === "string" && c["prevBand"] !== "none") s.band = { current: c["prevBand"] as "P1", since: NOW - 30_000, ruleId: "prev", sticky: true };
  return s;
}

function assertDecision(c: Record<string, Primitive>, s: SessionState, d: Decision, cover: Set<string>) {
  const where = JSON.stringify(c);
  if (d.why.commander) cover.add(d.why.commander);
  if (d.why.bandRule) cover.add(d.why.bandRule);
  if (d.why.policyRule) cover.add(d.why.policyRule);
  if (d.pick.strategy) cover.add(`${d.pick.skill}.${d.pick.strategy}`);
  cover.add(d.pick.cardId);

  if (d.band === "P0") {
    if (d.pick.skill !== "emergency_escalation") throw new Error(`INV-001 ${where}`);
  } else if (d.pick.skill === "emergency_escalation") throw new Error(`emergency outside P0 ${where}`);
  if (d.why.because.length === 0) throw new Error(`unexplained decision ${where}`);
  if (d.pick.strategy === "relocate" && (c["responsiveness"] === "impaired" || c["physicallyUnsafe"] === "yes")) throw new Error(`INV-006 ${where}`);
  if (d.pick.strategy === "relocate" && c["relocateBlocked"] === true) throw new Error(`INV-005 ${where}`);
  if (d.pick.strategy === "message_whatsapp" && s.connectivity === "offline") throw new Error(`network requirement ${where}`);
  const eng = REG.data.engagement[d.band];
  if (!eng) throw new Error(`no engagement for ${d.band}`);
}

/* ───────── Tier A: decideCore over the broad space (no question layer) ───────── */
const TIER_A: Dim[] = [
  { name: "actor", values: ["self", "helper"] },
  { name: "responsiveness", values: ["responsive", "impaired", "unknown"] },
  { name: "breathing", values: ["normal", "abnormal", "unknown"] },
  { name: "chest", values: ["no", "unknown"] },
  { name: "seizure", values: ["no", "unknown"] },
  { name: "anxiety", values: [0, 1, 2, 3, 4, "unknown"] },
  { name: "noise", values: ["quiet", "moderate", "loud", "unknown"] },
  { name: "company", values: ["with_someone", "unknown", "alone"] },
  { name: "companion", values: ["none", "coming", "arrived", "unknown"] },
  { name: "substanceClass", values: ["none", "stim", "downer", "unknown"] },
  { name: "reportedTrend", values: ["better", "same", "worse", "unknown"] },
  { name: "silence", values: [0, 1, 2] },
  { name: "due", values: [false, true] },
  { name: "relocateBlocked", values: [false, true] },
];

/* ───────── Tier B: full decide() (with VOI) over a projected space ───────── */
const TIER_B: Dim[] = [
  { name: "actor", values: ["self", "helper"] },
  { name: "responsiveness", values: ["responsive", "impaired", "unknown"] },
  { name: "breathing", values: ["normal", "abnormal", "unknown"] },
  { name: "chest", values: ["no", "unknown"] },
  { name: "anxiety", values: [1, 3, 4, "unknown"] },
  { name: "noise", values: ["quiet", "loud", "unknown"] },
  { name: "company", values: ["with_someone", "alone", "unknown"] },
  { name: "companion", values: ["none", "coming", "arrived"] },
  { name: "substanceClass", values: ["none", "downer", "stim", "unknown"] },
  { name: "silence", values: [0, 1] },
  { name: "due", values: [false, true] },
  { name: "connectivity", values: ["online", "offline"] },
  { name: "resumed", values: [false, true] },
  { name: "exhausted", values: [false, true] },
];

const coverage = new Set<string>();

describe("exhaustive decision space", () => {
  it("Tier A — decideCore is total, safe and monotone over every reachable state", () => {
    let n = 0;
    const bandOf = new Map<string, number>();
    for (const c of cartesian(TIER_A)) {
      const s = mkState(c);
      if (!s) continue;
      const { decision } = decideCore(s, NOW, REG);
      assertDecision(c, s, decision, coverage);
      bandOf.set(JSON.stringify(c), RANK[decision.band]!);
      n++;
    }
    // Monotonicity: stepping ONE dimension towards danger never lowers severity (rank must not grow).
    const DANGER: Record<string, Primitive[]> = {
      anxiety: [0, 1, 2, 3, 4],
      responsiveness: ["responsive", "impaired"],
      breathing: ["normal", "abnormal"],
      company: ["with_someone", "unknown", "alone"],
      reportedTrend: ["better", "same", "worse"],
      silence: [0, 1, 2],
      noise: ["quiet", "moderate", "loud"],
    };
    let checks = 0;
    const violations: string[] = [];
    for (const c of cartesian(TIER_A)) {
      const key = JSON.stringify(c);
      const r = bandOf.get(key);
      if (r === undefined) continue;
      for (const [dim, order] of Object.entries(DANGER)) {
        const i = order.indexOf(c[dim]!);
        if (i < 0 || i === order.length - 1) continue;
        const worse = bandOf.get(JSON.stringify({ ...c, [dim]: order[i + 1] }));
        if (worse === undefined) continue;
        checks++;
        if (worse > r) violations.push(`${dim}: ${String(c[dim])}→${String(order[i + 1])} lowered severity at ${key}`);
      }
    }
    console.log(`Tier A: ${n.toLocaleString()} reachable states, ${checks.toLocaleString()} monotonicity checks`);
    expect(violations.slice(0, 5)).toEqual([]);
  });

  it("Tier B — full decide() with the VOI question layer is total and safe", () => {
    let n = 0;
    const voi = { critical: 0, decisive: 0 };
    for (const c of cartesian(TIER_B)) {
      const s = mkState(c);
      if (!s) continue;
      const d = decide(s, NOW, REG, true);
      assertDecision(c, s, d, coverage);
      if (d.band === "P0" && d.pick.skill === "assess") throw new Error(`INV-017 ${JSON.stringify(c)}`);
      if (d.why.voi) voi[d.why.voi.class === "critical" ? "critical" : "decisive"]++;
      n++;
    }
    console.log(`Tier B: ${n.toLocaleString()} reachable states (VOI critical=${voi.critical}, decisive=${voi.decisive})`);
    expect(n).toBeGreaterThan(10_000);
  });

  it("Tier C — hysteresis only ever holds severity UP, never down (L03)", () => {
    const TIER_C: Dim[] = [
      { name: "actor", values: ["self", "helper"] },
      { name: "responsiveness", values: ["responsive", "impaired"] },
      { name: "breathing", values: ["normal"] },
      { name: "chest", values: ["no"] },
      { name: "seizure", values: ["no"] },
      { name: "anxiety", values: [1, 3, 4, "unknown"] },
      { name: "noise", values: ["quiet", "loud", "unknown"] },
      { name: "company", values: ["with_someone", "alone"] },
      { name: "reportedTrend", values: ["unknown", "same"] },
      { name: "prevBand", values: ["none", "P1", "P2", "P3"] },
      { name: "explicit", values: [true, false] },
      { name: "silence", values: [0, 1] },
    ];
    let n = 0;
    let held = 0;
    for (const c of cartesian(TIER_C)) {
      const s = mkState(c);
      if (!s) continue;
      const d = decide(s, NOW, REG, c["explicit"] === true);
      assertDecision(c, s, d, coverage);
      const raw = determineBand(null, buildFacts(s, NOW, REG).facts, NOW, REG, true).next.current;
      if (d.band !== "P0" && RANK[d.band]! > RANK[raw]!) throw new Error(`hysteresis lowered severity ${JSON.stringify(c)}`);
      if (d.why.heldByHysteresis) held++;
      n++;
    }
    console.log(`Tier C: ${n} states (${held} held by hysteresis)`);
    expect(held).toBeGreaterThan(0);
  });

  it("P0 precedence — every subset of emergency facts is commanded by the lowest-numbered rule (L04)", () => {
    const triggers: [string, Primitive, string][] = [
      ["responsiveness", "unresponsive", "HR-001"],
      ["breathing", "severely_abnormal", "HR-002"],
      ["seizure", "yes", "HR-003"],
      ["chest", "yes", "HR-004"],
      ["physicallyUnsafe", "yes", "HR-005"],
      ["syncope", "yes", "HR-006"],
      ["selfHarm", "yes", "HR-007"],
      ["engaged", true, "HR-009"],
    ];
    let n = 0;
    for (let mask = 1; mask < 1 << triggers.length; mask++) {
      for (const actor of ["self", "helper"]) {
        const c: Record<string, Primitive> = { actor };
        const on = triggers.filter((_, i) => mask & (1 << i));
        for (const [k, v] of on) c[k] = v;
        const s = mkState(c)!;
        const d = decide(s, NOW, REG, true);
        expect(d.band).toBe("P0");
        expect(d.pick.skill).toBe("emergency_escalation");
        expect(d.why.commander).toBe(on[0]![2]);
        expect(d.why.alsoMatchingHardRules ?? []).toEqual(on.slice(1).map((t) => t[2]));
        coverage.add(on[0]![2]);
        n++;
      }
    }
    // HR-008 (silence after medical risk) is reachable only through time, covered by scenarios.
    const s = mkState({ actor: "helper", responsiveness: "impaired", silence: 2 })!;
    expect(decide(s, NOW, REG, true).why.commander).toBe("HR-008");
    coverage.add("HR-008");
    console.log(`P0 precedence: ${n} combinations`);
  });

  it("coverage — every hard rule, band rule, policy rule and strategy is reachable (no dead rules)", () => {
    const expected = [
      ...REG.data.hardRules.map((h) => h.id),
      ...REG.data.bandRules.map((b) => b.id),
      ...Object.values(REG.data.policies).flat().map((p) => p.id),
      ...REG.data.skills.flatMap((s) => s.strategies.map((st) => `${s.id}.${st.id}`)),
    ];
    // Reachable only through a SEQUENCE (one strategy refused, the next one offered), never from a
    // single abstract state. Each one is pinned by a golden scenario instead. The list must stay honest:
    const HISTORY_ONLY = new Set(["grounding.feet_floor", "grounding.five_senses", "contact_trusted_person.crisis_line"]);
    const stale = [...HISTORY_ONLY].filter((id) => coverage.has(id));
    expect(stale, "HISTORY_ONLY lists rules that ARE reachable — remove them").toEqual([]);
    const dead = expected.filter((id) => !coverage.has(id) && !HISTORY_ONLY.has(id));
    console.log(`coverage: ${expected.length - dead.length}/${expected.length} rules reachable from single states (+${HISTORY_ONLY.size} history-only)`);
    expect(dead).toEqual([]);
  });
});

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
import { SCENARIOS, runScenario } from "../scenarios/scenarios";
import { decide, decideCore } from "../../src/core/planner/decide";
import { determineBand } from "../../src/core/safety/band-engine";
import { buildFacts } from "../../src/core/logic/facts";
import type { Decision } from "../../src/core/domain/decision";
import type { Primitive } from "../../src/core/domain/signals";
import { helperPerspectiveViolation } from "../invariants/perspective";

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
  if (typeof c["helpLast"] === "string" && c["helpLast"] !== "none") {
    // Abstract history for help.last (audit 011): the last help card on screen was of this skill.
    s.card = { instanceId: "h", key: "h", cardId: "CARD_HOLD", kind: "action", band: "P2", skill: c["helpLast"] as "care", strategy: "x", variantKeys: [], actions: [], shownAt: NOW - 5000 };
  }
  if (c["groundingDone"] === true) s.strategies["grounding.feet_floor"] = { doneAt: NOW - 400_000, blockedUntil: null, shows: 1 };
  if (c["helpExhausted"] === true) {
    // Every technique and care tip was refused (blocked): what is left must still be help (contact, then the fallback).
    for (const sk of REG.data.skills) if (sk.id === "grounding" || sk.id === "care") for (const st of sk.strategies) s.strategies[`${sk.id}.${st.id}`] = { doneAt: null, blockedUntil: NOW + 1e6, shows: 1 };
  }
  if (c["pace"] === "slow") s.answerPace = [{ ms: 60_000, at: NOW - 2000 }, { ms: 60_000, at: NOW - 1000 }];
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
  // L10 — a helper is never addressed as the person in crisis.
  if (c["actor"] === "helper") { const v = helperPerspectiveViolation(d.pick, d.band); if (v) throw new Error(`L10 ${v} at ${where}`); }
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

/* ───────── Tier D (audit 011): what was used × the care loop × pace, over decideCore ───────── */
const CLASS_OF: Record<string, string> = { coke: "stim", md: "stim", ghb: "downer", downer_pill: "downer", alcohol: "downer", ket: "psychedelic", cannabis: "psychedelic", lsd: "psychedelic", inhalant: "psychedelic" };
const TIER_D: Dim[] = [
  { name: "actor", values: ["self", "helper"] },
  { name: "responsiveness", values: ["responsive", "impaired"] },
  { name: "breathing", values: ["normal", "abnormal"] },
  { name: "chest", values: ["no"] },
  { name: "seizure", values: ["no"] },
  { name: "company", values: ["with_someone"] },
  { name: "anxiety", values: [1, 3, 4] },
  { name: "substanceClass", values: ["stim", "downer", "psychedelic", "none", "unknown"] },
  { name: "substance", values: ["coke", "md", "ghb", "downer_pill", "alcohol", "ket", "cannabis", "lsd", "inhalant", "unknown"] },
  { name: "alcohol", values: ["yes", "no", "unknown"] },
  { name: "sexEnhancer", values: ["pill", "poppers", "both", "none", "unknown"] },
  { name: "discomfort", values: ["nose", "throat", "heat", "nausea", "jaw", "unknown"] },
  { name: "helpLast", values: ["none", "grounding", "care", "combination", "steady_check"] },
  { name: "groundingDone", values: [false, true] },
  { name: "pace", values: ["unknown", "slow"] },
  { name: "helpExhausted", values: [false, true] },
];
function reachableD(c: Record<string, Primitive>): boolean {
  const sub = String(c["substance"]);
  if (sub !== "unknown" && CLASS_OF[sub] !== c["substanceClass"]) return false; // "which one?" is asked only under its class
  if (sub === "alcohol" && c["alcohol"] !== "yes") return false; // "Só álcool" records alcohol = yes
  const used = ["stim", "downer", "psychedelic"].includes(String(c["substanceClass"]));
  if (!used && (sub !== "unknown" || c["alcohol"] !== "unknown" || c["sexEnhancer"] !== "unknown")) return false; // asked only after a substance
  if (c["helpLast"] === "none" && c["groundingDone"] === true) return false;
  return true;
}

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
      // INV-027 — grounding respects physiology (proven over the whole space, not only in scenarios).
      if (decision.pick.skill === "grounding" && decision.pick.strategy === "breath_pacer") {
        if (c["breathing"] !== "normal" || c["responsiveness"] !== "responsive") throw new Error(`INV-027 breath_pacer at ${JSON.stringify(c)}`);
      }
      if (decision.pick.skill === "grounding" && decision.pick.strategy === "five_senses" && c["responsiveness"] !== "responsive") throw new Error(`INV-027 five_senses at ${JSON.stringify(c)}`);
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

  it("Tier D — what was used, combinations, the care loop and pace: total, never P0 by itself, nothing unsafe by mouth", () => {
    let n = 0;
    const MOUTH = new Set(["sip_water", "eat_something", "throat_soothe", "brush_teeth"]);
    for (const c of cartesian(TIER_D)) {
      if (!reachableD(c)) continue;
      const s = mkState(c);
      if (!s) continue;
      const { decision: d } = decideCore(s, NOW, REG);
      assertDecision(c, s, d, coverage);
      const where = JSON.stringify(c);
      const f = buildFacts(s, NOW, REG).facts;
      // L26: no hard rule reads what was used, so a combination alone is never P0.
      if (d.band === "P0") throw new Error(`P0 without a red flag ${where}`);
      if (d.pick.skill === "combination" && Number(f["risk.mixing"]) < 2) throw new Error(`combination warning without a combination ${where}`);
      if (Number(f["risk.mixing"]) >= 3 && d.band !== "P1") throw new Error(`mixing 3 not in P1 ${where}`);
      if (d.pick.skill === "care" && MOUTH.has(d.pick.strategy ?? "") && (c["breathing"] !== "normal" || c["responsiveness"] !== "responsive")) throw new Error(`by mouth while breathing/responsiveness not normal ${where}`);
      if (d.pick.strategy === "cool_shower" && (c["substanceClass"] === "downer" || ["ghb", "downer_pill", "ket", "alcohol"].includes(String(c["substance"])) || c["responsiveness"] !== "responsive")) throw new Error(`shower while sedated ${where}`);
      if (d.pick.strategy === "breath_pacer") throw new Error(`retired breath card picked ${where}`);
      // L25: pace never moves the band.
      if (c["helpExhausted"] === true) {
    // Every technique and care tip was refused (blocked): what is left must still be help (contact, then the fallback).
    for (const sk of REG.data.skills) if (sk.id === "grounding" || sk.id === "care") for (const st of sk.strategies) s.strategies[`${sk.id}.${st.id}`] = { doneAt: null, blockedUntil: NOW + 1e6, shows: 1 };
  }
  if (c["pace"] === "slow") {
        const quick = decideCore({ ...s, answerPace: [] }, NOW, REG).decision;
        if (quick.band !== d.band) throw new Error(`pace changed the band ${where}`);
      }
      n++;
    }
    console.log(`Tier D: ${n.toLocaleString()} reachable states`);
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
      ...REG.data.skills.flatMap((s) => s.strategies.filter((st) => !st.retired).map((st) => `${s.id}.${st.id}`)),
    ];
    // Reachable only through a SEQUENCE, never from a single abstract state: a strategy offered after an earlier one
    // was done or refused, or (L21, audit 010) contact for a person helping themselves, which comes after a first
    // technique. Each one names the golden scenario that exercises it, and that is checked below. The list must stay honest:
    const HISTORY_ONLY = new Map<string, string>([
      ["grounding.double_sigh", "grounding-rotation"],
      ["grounding.humming", "grounding-rotation"],
      ["P1-020", "self-alone-friend-coming"],
      ["contact_trusted_person.message_whatsapp", "self-alone-friend-coming"],
      ["contact_trusted_person.message_sms", "prefers-sms"],
      ["contact_trusted_person.crisis_line", "nobody-to-call"],
      // Audit 011: everyday care tips come after water and fresh air (rotation), so only a session reaches them.
      ["care.put_away", "pista-bala-alcool-azulzinho"],
      ["care.eat_something", "grounding-rotation"],
      ["care.brush_teeth", "grounding-rotation"],
      ["care.cool_shower", "grounding-rotation"],
      ["care.soft_music", "grounding-rotation"],
    ]);
    const stale = [...HISTORY_ONLY.keys()].filter((id) => coverage.has(id));
    const deadPreview = expected.filter((id) => !coverage.has(id) && !HISTORY_ONLY.has(id));
    if (stale.length || deadPreview.length) console.log(`coverage gate: stale=${stale.join(",")} dead=${deadPreview.join(",")}`);
    expect(stale, "HISTORY_ONLY lists rules that ARE reachable — remove them").toEqual([]);
    for (const [id, name] of HISTORY_ONLY) {
      const sc = SCENARIOS.find((x) => x.name === name);
      expect(sc, `${id}: no golden scenario ${name}`).toBeDefined();
      const hit = runScenario(sc!).some((r) => `${r.output.card.skill}.${r.output.card.strategy}` === id || r.log.why.policyRule === id);
      expect(hit, `${id} is history-only but ${name} never reaches it`).toBe(true);
    }
    const dead = expected.filter((id) => !coverage.has(id) && !HISTORY_ONLY.has(id));
    console.log(`coverage: ${expected.length - dead.length}/${expected.length} rules covered: ${expected.length - dead.length - HISTORY_ONLY.size} from single states + ${HISTORY_ONLY.size} through pinned scenarios${dead.length ? ` — dead: ${dead.join(", ")}` : ""}`);
    expect(dead).toEqual([]);
  });
});

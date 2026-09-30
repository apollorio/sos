/** SNAPSHOT + RETENTION — evidence thresholds, buckets, 180-day purge, no probabilities. */
import { describe, it, expect } from "vitest";
import { REG } from "../../src/core/registry";
import { deriveSnapshot } from "../../src/core/continuity/snapshot";
import { strategyPriors } from "../../src/core/continuity/priors";
import { purgeExpired, bucketOf } from "../../src/core/continuity/retention";
import { synthHistory } from "./helpers";

const DAY = 86_400_000;
const NOW = 1_800_000_000_000 + 200 * DAY;

describe("continuity snapshot", () => {
  it("counts episodes, attributes outcomes to the strategy that preceded them, buckets by recency", () => {
    const evs = [...synthHistory("grounding", "five_senses", 3, "better", NOW - 2 * DAY), ...synthHistory("reduce_stimulation", "relocate", 2, "worse", NOW - 40 * DAY, "R")];
    const s = deriveSnapshot(evs, NOW, REG);
    expect(s.episodeCount).toBe(5);
    const g = s.strategyHistory.find((h) => h.strategy === "grounding.five_senses")!;
    expect(g.attempted).toBe(3); expect(g.completed).toBe(3); expect(g.outcome.better).toBe(3); expect(g.bucket).toBe("RECENT");
    const r = s.strategyHistory.find((h) => h.strategy === "reduce_stimulation.relocate")!;
    expect(r.outcome.worse).toBe(2); expect(r.bucket).toBe("RELEVANT");
    for (const h of s.strategyHistory) for (const v of Object.values(h.outcome)) expect(Number.isInteger(v)).toBe(true);
  });

  it("needs repetition: 2 episodes are not evidence, 3 with 2 better are (INV-021 evidence rule)", () => {
    expect(strategyPriors(deriveSnapshot(synthHistory("grounding", "feet_floor", 2, "better", NOW - DAY), NOW, REG), REG)["grounding.feet_floor"]).toBeUndefined();
    expect(strategyPriors(deriveSnapshot(synthHistory("grounding", "feet_floor", 3, "better", NOW - DAY), NOW, REG), REG)["grounding.feet_floor"]).toBe("helpful");
    expect(strategyPriors(deriveSnapshot(synthHistory("grounding", "feet_floor", 3, "worse", NOW - DAY), NOW, REG), REG)["grounding.feet_floor"]).toBe("unhelpful");
    expect(strategyPriors(deriveSnapshot(synthHistory("grounding", "feet_floor", 3, "same", NOW - DAY), NOW, REG), REG)["grounding.feet_floor"]).toBeUndefined();
  });

  it("recent evidence beats old evidence; old evidence still counts when nothing newer exists", () => {
    const old = synthHistory("grounding", "feet_floor", 3, "better", NOW - 120 * DAY);
    expect(strategyPriors(deriveSnapshot(old, NOW, REG), REG)["grounding.feet_floor"]).toBe("helpful");
    const recentBad = synthHistory("grounding", "feet_floor", 3, "worse", NOW - 3 * DAY, "R");
    expect(strategyPriors(deriveSnapshot([...old, ...recentBad], NOW, REG), REG)["grounding.feet_floor"]).toBe("unhelpful");
  });

  it("purges whole episodes after journalDays and buckets ages discretely", () => {
    const evs = [...synthHistory("grounding", "feet_floor", 1, "better", NOW - 10 * DAY), ...synthHistory("grounding", "feet_floor", 1, "better", NOW - 181 * DAY, "OLD")];
    const kept = purgeExpired(evs, NOW, REG);
    expect(new Set(kept.map((e) => e.episodeId))).toEqual(new Set(["H0"]));
    expect(bucketOf(5 * DAY, REG)).toBe("RECENT"); expect(bucketOf(45 * DAY, REG)).toBe("RELEVANT"); expect(bucketOf(150 * DAY, REG)).toBe("OLD"); expect(bucketOf(200 * DAY, REG)).toBeNull();
    expect(deriveSnapshot(evs, NOW, REG).episodeCount).toBe(1);
  });

  it("support patterns: alone → support arrived → better", () => {
    const base = synthHistory("contact_trusted_person", "stay_close", 1, "better", NOW - DAY);
    const t = base[0]!.clientObservedAt;
    const extra = (seq: number, dt: number, signal: string, value: string) => ({ ...base[1]!, eventId: `H0:${seq}`, clientSeq: seq, clientObservedAt: t + dt * 1000, payload: { signal, value, source: "user_explicit", questionId: null, triggerId: null, unknownAnswer: false } });
    const evs = [...base.slice(0, 2), extra(20, 3, "company", "alone"), extra(21, 50, "companion", "arrived"), ...base.slice(2).map((e) => ({ ...e, clientSeq: e.clientSeq + 30, eventId: `H0:${e.clientSeq + 30}` }))];
    const s = deriveSnapshot(evs, NOW, REG);
    expect(s.supportPatterns.episodesAlone).toBe(1);
    expect(s.supportPatterns.improvedAfterSupport).toBe(1);
  });
});

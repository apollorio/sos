/** CRISIS PASSPORT — INV-022 (reported ≠ derived), INV-023 (no diagnosis), determinism, scopes (L18). */
import { describe, it, expect } from "vitest";
import { REG } from "../../src/core/registry";
import { LOCALES } from "../../src/ui/locale";
import { buildCrisisSummary, renderSummary, findForbiddenTerms, defaultScopes, allowedScopes } from "../../src/core/handoff/summary";
import { deriveSnapshot } from "../../src/core/continuity/snapshot";
import { runWithJournal } from "../continuity/helpers";
import { synthHistory } from "../continuity/helpers";

const loc = LOCALES["pt-BR"]!.continuity;

// self · no red flags · thinks normally · anxiety high · alone · open whatsapp · hide/return · ...
const STORY = [
  { k: "tap" as const, pick: 0, dt: 2 }, { k: "tap" as const, pick: 0, dt: 2 }, { k: "tap" as const, pick: 0, dt: 2 },
  { k: "tap" as const, pick: 3, dt: 2 }, { k: "tap" as const, pick: 0, dt: 2 }, { k: "tap" as const, pick: 0, dt: 2 },
  { k: "rt" as const, ev: "APP_HIDDEN" as const, dt: 1 }, { k: "rt" as const, ev: "APP_VISIBLE" as const, dt: 200 }, { k: "tap" as const, pick: 0, dt: 2 },
];

describe("crisis passport (deterministic summaries)", () => {
  const { journal } = runWithJournal(STORY, "EP1");
  const now = journal.events.at(-1)!.clientObservedAt + 60_000;

  it("keeps reported and derived apart; every line traces to a journal event (INV-022)", () => {
    const s = buildCrisisSummary(journal.events, "EP1", { audience: "health_professional", now }, REG);
    expect(s.reported.length).toBeGreaterThan(0);
    expect(s.derived.length).toBeGreaterThan(0);
    for (const l of s.reported) expect(l.provenance).toMatch(/_explicit$/);
    for (const l of s.derived) expect(l.provenance).toBe("derived");
    const ats = new Set(journal.events.map((e) => e.clientObservedAt));
    for (const l of [...s.reported, ...s.derived, ...s.course]) expect(ats.has(l.at)).toBe(true);
  });

  it("renders deterministically and contains the disclaimer for professionals", () => {
    const s = buildCrisisSummary(journal.events, "EP1", { audience: "health_professional", now }, REG);
    const a = renderSummary(s, loc), b = renderSummary(s, loc);
    expect(a).toBe(b);
    expect(a).toContain(loc.professional["disclaimer"]);
    expect(a).toContain(loc.professional["reportedHeading"]);
    expect(a).toContain(loc.professional["derivedHeading"]);
  });

  it("the friend version is short, has no derived interpretations and no exposure context by default (L18)", () => {
    const s = buildCrisisSummary(journal.events, "EP1", { audience: "trusted_person", now }, REG);
    expect(s.scopes).toEqual(["CURRENT_EPISODE"]);
    expect(s.previous).toBeNull();
    expect(s.reported.some((l) => l.key.startsWith("signal:substanceClass"))).toBe(false);
    const txt = renderSummary(s, loc);
    expect(txt).not.toContain(loc.professional["derivedHeading"]);
    expect(txt.length).toBeLessThan(1200);
    expect(txt).toContain(loc.trusted["closing"]);
  });

  it("scopes are enforced: a friend cannot receive professional scopes; location only when chosen (D16)", () => {
    const s = buildCrisisSummary(journal.events, "EP1", { audience: "trusted_person", scopes: ["CURRENT_EPISODE", "STRATEGY_HISTORY", "EXPOSURE_CONTEXT"], now }, REG);
    expect(s.scopes).toEqual(["CURRENT_EPISODE"]);
    const noLoc = buildCrisisSummary(journal.events, "EP1", { audience: "trusted_person", now, location: "-22.97,-43.18" }, REG);
    expect(noLoc.location).toBeNull();
    const withLoc = buildCrisisSummary(journal.events, "EP1", { audience: "trusted_person", scopes: ["CURRENT_EPISODE", "LOCATION_CURRENT"], now, location: "-22.97,-43.18" }, REG);
    expect(withLoc.location).toBe("-22.97,-43.18");
    expect(allowedScopes("health_professional", REG)).toContain("EXPOSURE_CONTEXT");
    expect(defaultScopes("trusted_person", REG)).not.toContain("EXPOSURE_CONTEXT");
  });

  it("includes the 180-day block for professionals from the snapshot, never a diagnosis (INV-023)", () => {
    const hist = synthHistory("grounding", "five_senses", 3, "better", now - 5 * 86_400_000);
    const snapshot = deriveSnapshot([...hist, ...journal.events], now, REG);
    const s = buildCrisisSummary(journal.events, "EP1", { audience: "health_professional", snapshot, now }, REG);
    expect(s.previous?.episodeCount).toBe(4);
    expect(s.previous?.helpful).toEqual(["grounding.five_senses"]);
    const txt = renderSummary(s, loc);
    expect(findForbiddenTerms(txt, REG)).toEqual([]);
  });

  it("the whole locale continuity vocabulary is free of forbidden inference terms (INV-023)", () => {
    const all = JSON.stringify(loc);
    expect(findForbiddenTerms(all, REG)).toEqual([]);
    expect(findForbiddenTerms("isso parece depressão", REG)).toEqual(["depressão", "depressao"]);
  });

  it("every signal value, strategy, band and hard-rule reason used by the registry has a phrase", () => {
    const SKIP = new Set(["actor.unknown", "syncope.no", "selfHarm.no"]);
    for (const sig of REG.data.signals) for (const v of sig.domain) {
      const k = `${sig.id}.${v}`;
      if (v === "unknown" || SKIP.has(k)) continue;
      expect(loc.signalPhrases[k], k).toBeTruthy();
    }
    for (const k of REG.strategy.keys()) expect(loc.strategyPhrases[k], k).toBeTruthy();
    for (const b of REG.data.bands) expect(loc.bandPhrases[b.id]).toBeTruthy();
    for (const h of REG.data.hardRules) expect(loc.reasonPhrases[h.reason], h.reason).toBeTruthy();
  });
});

describe("pure civil-date formatting matches the platform Date for arbitrary instants", () => {
  it("fmtTime/fmtDate agree with Date at UTC-3 and UTC+0", async () => {
    const { fmtTime, fmtDate } = await import("../../src/core/handoff/summary");
    const fc = (await import("fast-check")).default;
    fc.assert(fc.property(fc.integer({ min: 0, max: 4_102_444_800_000 }), fc.constantFrom(-180, 0, 330), (at, tz) => {
      const d = new Date(at + tz * 60_000);
      const p = (n: number) => String(n).padStart(2, "0");
      expect(fmtTime(at, tz)).toBe(`${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`);
      expect(fmtDate(at, tz)).toBe(`${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`);
    }), { numRuns: 300 });
  });
});

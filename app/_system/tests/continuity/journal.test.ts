/**
 * JOURNAL (event schema v2) — INV-022, INV-024, L17.
 * Derived from real engine runs: deterministic, append-only, idempotent, provenance on every event, never free text.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { appendEvents, guardPayload } from "../../src/core/journal/journal";
import { JOURNAL_KINDS } from "../../src/generated/registry.gen";
import { runWithJournal, stepArb, tap } from "./helpers";



describe("journal (event schema v2)", () => {
  it("is deterministic: same run ⇒ byte-identical journal (INV-011 extended)", () => {
    fc.assert(fc.property(fc.array(stepArb, { maxLength: 30 }), (steps) => {
      const a = runWithJournal(steps).journal;
      const b = runWithJournal(steps).journal;
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }), { numRuns: 150 });
  });

  it("is append-only with strictly increasing clientSeq and unique eventIds (INV-024)", () => {
    fc.assert(fc.property(fc.array(stepArb, { maxLength: 40 }), (steps) => {
      const { journal } = runWithJournal(steps);
      const ids = new Set<string>();
      let last = 0;
      for (const e of journal.events) {
        expect(e.clientSeq).toBeGreaterThan(last);
        last = e.clientSeq;
        expect(ids.has(e.eventId)).toBe(false);
        ids.add(e.eventId);
        expect(e.eventId).toBe(`${e.episodeId}:${e.clientSeq}`);
        expect(e.serverReceivedAt).toBeNull();
        expect(e.schemaVersion).toBe(2);
      }
    }), { numRuns: 150 });
  });

  it("ignores duplicates on append (idempotent) and rejects rewinds", () => {
    const { journal } = runWithJournal([{ k: "tap", pick: 0, dt: 2 }, { k: "tap", pick: 1, dt: 2 }]);
    const again = appendEvents(journal, journal.events);
    expect(again.events.length).toBe(journal.events.length);
    const rewind = { ...journal.events[0]!, eventId: "J:999", clientSeq: 0 };
    expect(() => appendEvents(journal, [rewind])).toThrow(/append-only/);
  });

  it("never contains free text (L17): no input string survives into any payload", () => {
    fc.assert(fc.property(fc.array(stepArb, { maxLength: 40 }), (steps) => {
      const { journal, inputs } = runWithJournal(steps);
      const dump = JSON.stringify(journal.events.map((e) => e.payload));
      for (const inp of inputs) if (inp.kind === "text") for (const w of inp.text.split(" ")) if (w.length > 2) expect(dump).not.toContain(w);
      for (const e of journal.events) for (const v of Object.values(e.payload)) if (typeof v === "string") expect(v).toMatch(/^[A-Za-z0-9_.:¬|-]{1,64}$/);
    }), { numRuns: 150 });
  });

  it("every event carries provenance and a registered kind (INV-022)", () => {
    const kinds = new Set<string>(JOURNAL_KINDS);
    fc.assert(fc.property(fc.array(stepArb, { maxLength: 40 }), (steps) => {
      for (const e of runWithJournal(steps).journal.events) {
        expect(kinds.has(e.kind)).toBe(true);
        expect(["user_explicit", "helper_explicit", "runtime_observed", "derived"]).toContain(e.provenance);
        if (e.kind === "BAND_CHANGED" || e.kind === "CARD_SHOWN") expect(e.provenance).toBe("derived");
        if (e.kind === "SIGNAL_REPORTED" && e.payload["source"] === "user_explicit") expect(e.provenance).toMatch(/_explicit$/);
      }
    }), { numRuns: 100 });
  });

  it("records the story: boot → actor → P0 → correction, with a CORRECTION that stays (INV-024)", () => {
    const { journal } = runWithJournal([tap("helper"), tap("none")]); // helper → "does not respond" → P0
    const kinds = journal.events.map((e) => e.kind);
    expect(kinds[0]).toBe("EPISODE_STARTED");
    expect(kinds).toContain("SIGNAL_REPORTED");
    expect(kinds).toContain("CARD_SHOWN");
    const p0 = journal.events.find((e) => e.kind === "BAND_CHANGED" && e.payload["to"] === "P0");
    expect(p0?.payload["commander"]).toBe("HR-001");
    // Now "Me enganei"
    const last = journal.events.length;
    const mistake = runWithJournal([tap("helper"), tap("none"), tap("mistake")]).journal;
    expect(mistake.events.length).toBeGreaterThan(last);
    expect(mistake.events.some((e) => e.kind === "CORRECTION" && e.payload["ruleId"] === "HR-001")).toBe(true);
    expect(mistake.events.filter((e) => e.kind === "BAND_CHANGED" && e.payload["to"] === "P0").length).toBe(1); // history not rewritten
  });

  it("guardPayload refuses anything that is not id-like", () => {
    expect(() => guardPayload({ a: "quero morrer" })).toThrow();
    expect(() => guardPayload({ a: "x".repeat(65) })).toThrow();
    expect(guardPayload({ a: "HR-001", b: 3, c: true, d: null })).toBeTruthy();
  });
});


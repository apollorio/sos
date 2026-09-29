/**
 * BETA LAB — what testers and clinicians see must be exactly what the engine does.
 * The review sheet must cover everything the release gate asks a clinician to sign, and every tester mission
 * must be a golden scenario replayed through the real engine (so each "você deve ver" line is proven here).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { REG } from "../../src/core/registry";
import { LOCALES } from "../../src/ui/locale";
import { SCENARIOS } from "../scenarios/scenarios";
import { MISSIONS, missions, offlineMission, reviewSections, expandPattern, describePredicate } from "../../scripts/lab/model";
import { labFiles, LAB } from "../../scripts/build-lab";
import { summarize } from "../../scripts/review-summary";
import { REGISTRY_HASH } from "../../src/generated/registry.gen";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const D = REG.data as any;
const L = LOCALES["pt-BR"]!;
const sections = reviewSections();
const ids = sections.flatMap((s) => s.items.map((i) => i.id));
const required = new Set(sections.filter((s) => !s.optional).flatMap((s) => s.items.map((i) => i.id)));

describe("clinical review sheet", () => {
  it("covers every item the release gate asks a clinician to sign (CLINICAL-REVIEW.md)", () => {
    for (const h of D.hardRules as { id: string }[]) expect(required.has(h.id), h.id).toBe(true);
    for (const b of D.bandRules as { id: string }[]) expect(required.has(b.id), b.id).toBe(true);
    for (const t of D.textTriggers.rules as { id: string }[]) expect(required.has(t.id), t.id).toBe(true);
    for (const [id, c] of Object.entries(L.cards)) if (c.clinical) expect(required.has(id), id).toBe(true);
    for (const c of D.cards as { id: string }[]) expect(ids, c.id).toContain(c.id); // every card is there, once
    // Wider than the lint: every triage question and every strategy card (grounding contraindications, audit 003 J1).
    for (const id of ["CARD_GROUNDING_BREATH", "CARD_GROUNDING_FEET", "CARD_GROUNDING_SENSES", "CARD_Q_CLARITY", "CARD_Q_HOW_NOW"]) expect(required.has(id), id).toBe(true);
  });

  it("item ids are unique and hashes change when the reviewed text changes", () => {
    expect(new Set(ids).size).toBe(ids.length);
    const hashes = sections.flatMap((s) => s.items.map((i) => i.hash));
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it("shows readable conditions and words, never raw predicate JSON or a missing locale entry", () => {
    for (const s of sections) for (const i of s.items) for (const f of i.fields) {
      expect(f.text, `${i.id} · ${f.label}`).not.toMatch(/^\{|⚠/);
      expect(f.text.length, `${i.id} · ${f.label}`).toBeGreaterThan(0);
    }
    expect(describePredicate({ all: [{ gte: ["risk.isolation", 2] }, { eq: ["signal.substanceClass", "downer"] }] })).toBe("isolamento ≥ 2 e substância = downer («Pesado, lento, com sono»)");
    expect(describePredicate({ all: [{ any: [{ eq: ["signal.noise", "loud"] }, { gte: ["risk.medical", 3] }] }, { always: true }] })).toBe("(barulho = loud («Muito barulho ou luz») ou risco médico ≥ 3) e sempre");
  });

  it("every text trigger becomes readable examples (clinicians are not asked to read regular expressions)", () => {
    for (const t of D.textTriggers.rules as { id: string; patterns: string[] }[]) for (const p of t.patterns) {
      const ex = expandPattern(p);
      expect(ex.length, `${t.id} ${p}`).toBeGreaterThan(0);
      for (const e of ex) expect(e, `${t.id} ${p}`).not.toMatch(/[\\()[\]|?*]/);
    }
    expect(expandPattern("\\bdor (forte )?no peito\\b")).toEqual(["dor forte no peito", "dor no peito"]);
  });
});

describe("tester missions", () => {
  it("every mission is a golden scenario that passes, replayed with the real labels", () => {
    const names = new Set(SCENARIOS.map((s) => s.name));
    for (const m of MISSIONS) expect(names.has(m.scenario), m.scenario).toBe(true);
    const ms = missions();
    expect(ms).toHaveLength(MISSIONS.length);
    for (const m of ms) for (const s of m.steps) {
      expect(s.act, m.scenario).not.toContain("⚠");
      expect(s.see.length, m.scenario).toBeGreaterThan(0);
    }
  });

  it("warns before every step that opens the dialer or a messaging app", () => {
    for (const m of missions()) for (const s of m.steps)
      if (/«Ligar 192»|«Ligar 188»|«Abrir WhatsApp»|«Mandar SMS»/.test(s.act)) expect(s.warn, `${m.scenario}: ${s.act}`).toBeTruthy();
  });

  it("the P0 mission reaches «Ligue 192» within two taps, as the tester is told", () => {
    const m = missions().find((x) => x.scenario === "helper-unresponsive")!;
    expect(m.steps[1]!.p0).toBe(true);
    expect(m.steps[1]!.see).toContain("Ligue 192");
    expect(offlineMission().steps.at(-1)!.see).toContain("Ligar 192");
  });
});

describe("app/lab/ is what the current sources produce", () => {
  it("every generated page is committed and up to date (npm run build)", () => {
    const files = labFiles();
    for (const [f, c] of Object.entries(files)) {
      expect(existsSync(join(LAB, f)), f).toBe(true);
      expect(readFileSync(join(LAB, f), "utf8") === c, `app/lab/${f} is stale: run npm run build`).toBe(true);
    }
    expect(readdirSync(LAB).sort()).toEqual(Object.keys(files).sort());
  });

  it("the simulator copy makes no third-party request (its web fonts are dropped)", () => {
    const h = readFileSync(join(LAB, "simulador.html"), "utf8");
    expect(h).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(h).not.toMatch(/<link[^>]+https?:\/\//);
    expect(h).not.toMatch(/<script[^>]+src=/);
  });

  it("lab pages are noindex and self-contained (no third-party script)", () => {
    for (const f of ["index.html", "revisao.html", "roteiros.html"]) {
      const h = readFileSync(join(LAB, f), "utf8");
      expect(h, f).toContain('<meta name="robots" content="noindex, nofollow">');
      expect(h, f).not.toMatch(/<script[^>]+src=/);
      expect(h, f).not.toMatch(/https?:\/\/(?!schemas)/);
    }
  });
});

describe("review summary (npm run review:summary)", () => {
  const all = () => sections.filter((s) => !s.optional).flatMap((s) => s.items.map((i) => ({ id: i.id, hash: i.hash, reviewedHash: i.hash, verdict: "aprovado", comment: "" })));
  const base = { kind: "sos-apollo-clinical-review", version: 1, registryHash: REGISTRY_HASH, exportedAt: "2026-10-01T12:00:00Z", reviewer: { name: "Dra. Teste", registration: "CRM 0000" } };

  it("is ready to record only when every required item is approved on the current registry", () => {
    expect(summarize({ ...base, items: all() }).ready).toBe(true);
    const items = all(); items[0]!.verdict = "ajustes"; items[0]!.comment = "trocar a palavra";
    const r = summarize({ ...base, items });
    expect(r.ready).toBe(false);
    expect(r.markdown).toContain(`| ${items[0]!.id} | approved with changes | trocar a palavra |`);
    expect(summarize({ ...base, items: all().slice(1) }).markdown).toContain("without a verdict 1");
  });

  it("flags items whose text changed after the review and reviews of another registry", () => {
    const items = all(); items[0]!.reviewedHash = "0000000000";
    const r = summarize({ ...base, items });
    expect(r.ready).toBe(false);
    expect(r.markdown).toContain("changed after this review");
    expect(summarize({ ...base, registryHash: "ffffffffffffffff", items: all() }).ready).toBe(false);
    expect(() => summarize({ ...base, kind: "other", items: [] })).toThrow();
  });
});

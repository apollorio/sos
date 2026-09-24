import { describe, it, expect } from "vitest";
import { matchTriggers } from "../../src/core/ingest/text-triggers";
import { normalizeText } from "../../src/core/ingest/normalize-text";
import { REG } from "../../src/core/registry";

describe("normalization", () => {
  it("strips accents, case and punctuation", () => {
    expect(normalizeText("  Não CONSIGO   respirar!!! ")).toBe("nao consigo respirar");
  });
});

describe("local triggers (no NLP, no LLM)", () => {
  const aff = (t: string) => matchTriggers(t, REG).affirmative.map((a) => a.id);
  const neg = (t: string) => matchTriggers(t, REG).negated.map((a) => a.id);
  it.each([
    ["não consigo respirar", "TT-001"],
    ["meu amigo apagou aqui", "TT-002"],
    ["acho que desmaiei", "TT-003"],
    ["tô com uma dor forte no peito", "TT-004"],
    ["ela tá se debatendo", "TT-005"],
    ["eu quero morrer", "TT-006"],
    ["to em perigo aqui", "TT-007"],
  ])("'%s' → %s", (text, id) => {
    expect(aff(text)).toContain(id);
  });
  it("'bati uma foto do peito' does NOT trigger (brainstorm false-positive case)", () => {
    expect(aff("bati uma foto do peito")).toEqual([]);
  });
  it("negated mention asks instead of acting", () => {
    expect(aff("nao estou com dor no peito")).toEqual([]);
    expect(neg("nao estou com dor no peito")).toEqual(["TT-004"]);
  });
  it("unmatched chit-chat produces nothing", () => {
    expect(matchTriggers("oi tudo bem?", REG)).toEqual({ affirmative: [], negated: [] });
  });
});

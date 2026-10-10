/**
 * Tiles episode (app/index.html without the engine) → Relatório / Modo Médico: only what the page observed,
 * unknowns stay «NÃO INFORMADO», «Bateu forte» is professional-only, a tap is not a call, no diagnostic vocabulary.
 */
import { describe, it, expect } from "vitest";
import { REG } from "../../src/core/registry";
import { LOCALES } from "../../src/ui/locale";
import { parseTiles, buildTilesView, type TilesEpisode } from "../../src/report/tiles";
import { findForbiddenTerms } from "../../src/core/handoff/summary";

const L = LOCALES["pt-BR"]!;
const R = L.continuity.report;
const T0 = Date.UTC(2026, 9, 1, 3, 0, 0);
const at = (s: number) => T0 + s * 1000;
const ep: TilesEpisode = {
  v: 1, id: "tiles-x", startedAt: T0, lastAt: at(90), events: [
    { s: 1, at: at(0), k: "start" },
    { s: 2, at: at(10), k: "flow", f: "panico" },
    { s: 3, at: at(15), k: "choice", f: "panico", t: "Coração acelerado, falta de ar" },
    { s: 4, at: at(30), k: "task", f: "panico", t: "Água gelada no rosto, nuca ou punhos" },
    { s: 5, at: at(40), k: "tap", ch: "tel", to: "188" },
    { s: 6, at: at(50), k: "flow", f: "torto" },
    { s: 7, at: at(55), k: "choice", f: "torto", t: "Bebi álcool e tô mal" },
    { s: 8, at: at(60), k: "flow", f: "samu" },
    { s: 9, at: at(65), k: "choice", f: "samu", t: "Pode ter overdose ou intoxicação" },
    { s: 10, at: at(70), k: "risk", lvl: "EMERGENT" },
    { s: 11, at: at(80), k: "tap", ch: "tel", to: "192" },
  ],
};
const v = buildTilesView(ep, at(90), -180, REG, L);
const text = (x: unknown) => JSON.stringify(x);

describe("tiles journal · parse", () => {
  it("drops an expired episode (12 h, same as the engine) and malformed events", () => {
    const raw = JSON.stringify({ ...ep, events: [...ep.events, { s: 99, at: 1, k: "typed", t: "x" }, { s: "a", at: 1, k: "tap" }] });
    expect(parseTiles(raw, at(90), 12)!.events.length).toBe(ep.events.length);
    expect(parseTiles(raw, ep.lastAt + 12 * 3_600_000 + 1, 12)).toBeNull();
    expect(parseTiles("{oops", at(90), 12)).toBeNull();
    expect(parseTiles(JSON.stringify({ ...ep, v: 2 }), at(90), 12)).toBeNull();
  });
  it("never keeps a phone number as a tap target", () => {
    const raw = JSON.stringify({ ...ep, events: [{ s: 1, at: at(0), k: "tap", ch: "tel", to: "+55 21 99999-0000" }] });
    expect(parseTiles(raw, at(1), 12)!.events[0]!.to).toBeUndefined();
  });
});

describe("tiles episode · Relatório (person / trusted view)", () => {
  it("shows the walk: tile, option, task done, taps — a tap is not a call", () => {
    const titles = v.relatorio.timeline.map((r) => r.title);
    expect(titles).toEqual(expect.arrayContaining(["Abriu o app", "Escolheu «Coração acelerado, falta de ar» (Pânico · ansiedade)", "Fez: Água gelada no rosto, nuca ou punhos", "Tocou em ligar 188 (CVV)", "Tocou em ligar 192 (SAMU)"]));
    expect(v.relatorio.tried.map((c) => [c.title, c.outcome])).toEqual([["Água gelada no rosto, nuca ou punhos", R["out.done"]]]);
    expect(text(v.relatorio)).not.toMatch(/ligou|ligação feita/i);
  });
  it("leaves «Bateu forte», screening and the flow's attention level out", () => {
    expect(text(v.relatorio)).not.toMatch(/Bateu forte|álcool|atenção de urgência/i);
  });
});

describe("tiles episode · Modo Médico", () => {
  it("keeps every engine signal NÃO INFORMADO, never «não»", () => {
    expect([...v.medico.scan, ...v.medico.unknowns].every((s) => s.value === R["unknownValue"] && s.tone === "unknown")).toBe(true);
    expect(v.medico.p0).toBeNull();
  });
  it("lists exposure in the person's chosen words, professional only", () => {
    expect(v.medico.exposure.rows.map((r) => r.reported)).toEqual(["Bebi álcool e tô mal"]);
  });
  it("cites, never quotes, an option carrying diagnostic vocabulary (INV-023)", () => {
    expect(findForbiddenTerms(text(v), REG)).toEqual([]);
    expect(v.medico.timeline.map((r) => r.title)).toContain("Escolheu uma opção em Resgate · urgência (texto não reproduzido no resumo)");
  });
  it("labels the flow's attention level as derived and non-clinical", () => {
    const row = v.medico.timeline.find((r) => r.title.includes("de urgência"))!;
    expect(row.source).toBe(R["src.derived"]);
    expect(v.medico.annex.state[1]!.v).toMatch(/não é escore clínico/);
  });
});

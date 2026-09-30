/**
 * Relatório / Modo Médico — the handoff rules of study 006 hold on real engine journals:
 * reported ≠ derived ≠ unknown, "não informado" never becomes "não", exposure only for the professional,
 * no diagnostic vocabulary (INV-023), and the live journal obeys "Apagar agora".
 */
import { describe, it, expect } from "vitest";
import { REG } from "../../src/core/registry";
import { LOCALES } from "../../src/ui/locale";
import { buildView } from "../../src/report/model";
import { findForbiddenTerms } from "../../src/core/handoff/summary";
import { medicoScenarios } from "../../scripts/lab/model";
import { EngineLoop } from "../../src/runtime/engine-loop";
import { attachLiveFeed } from "../../src/runtime/live-feed";
import type { Store } from "../../src/runtime/storage/session-store";
import type { SessionState } from "../../src/core/domain/state";
import type { Journal } from "../../src/core/journal/journal";

const L = LOCALES["pt-BR"]!;
const R = L.continuity.report;
const scenarios = medicoScenarios();
const view = (name: string) => {
  const s = scenarios.find((x) => x.name === name)!;
  return buildView({ episodeId: s.episodeId, events: s.events, state: s.state, now: s.now, tz: -180, source: "lab" }, REG, L);
};
const allText = (v: unknown) => JSON.stringify(v);

describe("Modo Médico · mixed exposure (pista-bala-alcool-azulzinho)", () => {
  const { medico, relatorio } = view("pista-bala-alcool-azulzinho");

  it("keeps the person's own words for exposure and never infers composition, dose or route", () => {
    const rows = medico.exposure.rows.map((r) => r.reported);
    expect(rows).toEqual(expect.arrayContaining(["disse ter usado bala/MD", "disse que bebeu álcool junto", "disse ter tomado azulzinho", "nariz ardendo"]));
    expect(allText(medico)).not.toMatch(/sildenafil|MDMA|intranasal|via nasal/i);
    expect(medico.exposure.mixes.map((m) => m.title)).toEqual(["aviso: bala com álcool", "aviso: estimulante com azulzinho ou poppers"]);
  });

  it("prints unknown red flags as NÃO INFORMADO, never as «não»", () => {
    expect(medico.unknowns.map((u) => [u.signal, u.value, u.tone])).toEqual([
      ["seizure", R["unknownValue"], "unknown"], ["syncope", R["unknownValue"], "unknown"],
      ["selfHarm", R["unknownValue"], "unknown"], ["physicallyUnsafe", R["unknownValue"], "unknown"],
    ]);
    expect(medico.synthesis).toContain("Sem informação registrada: convulsão; desmaio; intenção de se machucar; segurança física do local.");
  });

  it("the technical annex matches the engine (band, rule, internal vector) and is labelled as non-clinical", () => {
    expect(medico.annex.state[0]!.v.startsWith("P2")).toBe(true);
    expect(medico.annex.state[1]!.v).toBe("P2-035 → care.put_away");
    expect(Object.fromEntries(medico.annex.risk.map((r) => [r.k, r.v]))).toMatchObject({ medical: "0", emotional: "4", mixing: "2" });
    expect(R["annexBanner"]).toMatch(/não correspondem a Manchester, ESI, NEWS2/);
  });

  it("the friend's Relatório leaves exposure and combination warnings out (EXPOSURE_CONTEXT is professional-only)", () => {
    const t = allText(relatorio);
    expect(t).not.toMatch(/bala|álcool|azulzinho|estimulante|poppers/);
    expect(relatorio.tried.map((c) => c.title)).toContain("soro no nariz");
  });
});

describe("Modo Médico · no use reported (slow-pace-asks-less)", () => {
  it("«nada» stays self-report, not an exclusion of exposure", () => {
    const { medico } = view("slow-pace-asks-less");
    expect(medico.exposure.rows).toEqual([]);
    expect(medico.exposure.note).toBe(R["exposureDenied"]);
  });
});

describe("Modo Médico · emergency (helper-unresponsive)", () => {
  it("P0 comes first, with its reason, and the helper perspective is explicit", () => {
    const { medico } = view("helper-unresponsive");
    expect(medico.p0).toContain("não respondia");
    expect(medico.synthesis.startsWith(R["synthActor.helper"]!)).toBe(true);
    expect(medico.scan.find((s) => s.signal === "responsiveness")!.tone).toBe("alert");
  });
});

describe("INV-023 · no diagnostic vocabulary in any generated report", () => {
  for (const s of scenarios) {
    it(s.name, () => {
      const v = view(s.name);
      expect(findForbiddenTerms(allText(v) + v.medico.copyText + v.relatorio.shareText, REG)).toEqual([]);
    });
  }
});

describe("live journal (acute store) · follows the loop, never outlives «Apagar agora»", () => {
  it("is saved on the loop's write chain, resumes with the episode and is replaced by the fresh session after a wipe", async () => {
    let now = 1_800_000_000_000;
    let state: SessionState | null = null;
    let journal: Journal | null = null;
    const writes: string[] = [];
    const store: Store = {
      loadState: async () => (state ? structuredClone(state) : null),
      saveState: async (s) => { state = structuredClone(s); writes.push(`state:${s.sessionId}`); },
      appendLog: async () => undefined,
      readLogs: async () => [],
      wipe: async () => { state = null; journal = null; writes.push("wipe"); },
      saveJournal: async (j) => { journal = structuredClone(j); writes.push(`journal:${j.episodeId}:${j.events.length}`); },
      loadJournal: async () => (journal && state && journal.episodeId === state.sessionId ? structuredClone(journal) : null),
    };
    const seen: number[] = [];
    const loop = new EngineLoop(store, () => undefined, () => now);
    loop.observe((_r, j) => { seen.push(j?.events.length ?? -1); });
    attachLiveFeed(loop, store, () => now);
    await loop.start();
    const first = loop.current!.sessionId;
    for (const a of ["self", "none"]) { now += 2000; await loop.dispatch({ kind: "tap", cardInstanceId: loop.current!.card!.instanceId, actionId: a }); }
    await loop.flushed();
    expect(journal!.episodeId).toBe(first);
    expect(seen.every((n, i) => i === 0 || n >= seen[i - 1]!)).toBe(true);

    // A reopened app resumes the same episode with its whole journal.
    const again = new EngineLoop(store, () => undefined, () => now);
    await again.start();
    expect(again.current!.sessionId).toBe(first);
    expect(again.episodeJournal!.events.length).toBeGreaterThanOrEqual(journal!.events.length);

    // «Apagar agora»: the wipe runs after every earlier journal write; afterwards only the new episode exists.
    const tap = async (a: string) => { now += 2000; await loop.dispatch({ kind: "tap", cardInstanceId: loop.current!.card!.instanceId, actionId: a }); };
    for (const a of ["yes", "low", "im_fine_end", "wipe"]) await tap(a);
    await loop.flushed();
    const wipeIdx = writes.lastIndexOf("wipe");
    expect(wipeIdx).toBeGreaterThan(0);
    expect(writes.slice(0, wipeIdx).some((w) => w.startsWith(`journal:${first}`))).toBe(true);
    expect(writes.slice(wipeIdx + 1).some((w) => w.startsWith(`journal:${first}`))).toBe(false);
    expect(loop.current!.sessionId).not.toBe(first);
    expect(journal!.episodeId).toBe(loop.current!.sessionId);
  });
});

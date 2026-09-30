/**
 * Engine loop under hostile storage — L12 (nothing gates help), INV-019 (the card never waits for storage),
 * and "Apagar agora" really erases: a wipe waits for earlier writes, so the erased session can never resume.
 */
import { describe, it, expect, vi } from "vitest";
import { EngineLoop, PERSIST_BUDGET_MS, BOOT_READ_BUDGET_MS } from "../../src/runtime/engine-loop";
import type { Store } from "../../src/runtime/storage/session-store";
import type { SessionState } from "../../src/core/domain/state";
import type { StepResult } from "../../src/core/domain/decision";

const T0 = 1_800_000_000_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fakeStore(o: { hang?: boolean; saveDelayMs?: number } = {}) {
  let saved: SessionState | null = null;
  const writes: string[] = [];
  const store: Store = {
    loadState: async () => (saved ? structuredClone(saved) : null),
    saveState: (s) => (o.hang ? new Promise<void>(() => {}) : new Promise<void>((res) => setTimeout(() => { saved = structuredClone(s); writes.push(`save:${s.sessionId}:${s.status}`); res(); }, o.saveDelayMs ?? 0))),
    appendLog: () => (o.hang ? new Promise<void>(() => {}) : Promise.resolve()),
    readLogs: async () => [],
    wipe: async () => { saved = null; writes.push("wipe"); },
  };
  return { store, writes, get saved() { return saved; } };
}

function mkLoop(store: Store) {
  let now = T0;
  const renders: StepResult[] = [];
  const loop = new EngineLoop(store, (r) => renders.push(r), () => now);
  const tap = async (actionId: string) => { now += 2000; await loop.dispatch({ kind: "tap", cardInstanceId: loop.current!.card!.instanceId, actionId }); };
  return { loop, renders, tap };
}

describe("engine loop vs. storage", () => {
  it("a wedged IndexedDB never holds the card: boot and every tap render at once (R1 red-team probe)", async () => {
    const f = fakeStore({ hang: true });
    const { loop, renders, tap } = mkLoop(f.store);
    void loop.start();
    await sleep(5);
    expect(renders.map((r) => r.output.card.cardId)).toEqual(["CARD_Q_ACTOR"]);
    const started = Date.now();
    await tap("helper");
    await tap("none");
    expect(Date.now() - started).toBeLessThan(PERSIST_BUDGET_MS);
    expect(renders.map((r) => r.output.card.cardId)).toEqual(["CARD_Q_ACTOR", "CARD_Q_RESPONDS", "CARD_P0_CALL"]);
    expect(renders.at(-1)!.output.effects).toContainEqual({ type: "KEEP_AWAKE", on: true });
  });

  it("'Apagar agora' right after 'Tô bem, encerrar' never resumes the erased session, even with slow writes", async () => {
    const f = fakeStore({ saveDelayMs: 40 });
    const { loop, renders, tap } = mkLoop(f.store);
    const wiped: string[] = [];
    loop.hooks = { onWipe: (id) => { wiped.push(id); } };
    await loop.start();
    const erased = loop.current!.sessionId;
    for (const a of ["self", "none", "yes", "low"]) await tap(a);
    expect(renders.at(-1)!.output.card.cardId).toBe("CARD_HOLD");
    await tap("im_fine_end");
    expect(renders.at(-1)!.output.card.cardId).toBe("CARD_SESSION_CLOSED");
    await tap("wipe"); // back-to-back: earlier saves are still in flight
    expect(loop.current!.sessionId).not.toBe(erased);
    expect(loop.current!.status).toBe("active");
    expect(renders.at(-1)!.output.card.cardId).toBe("CARD_Q_ACTOR");
    expect(Object.keys(loop.current!.signals)).toEqual([]);
    await loop.flushed();
    const afterWipe = f.writes.slice(f.writes.indexOf("wipe") + 1);
    expect(afterWipe.every((w) => !w.includes(erased))).toBe(true);
    expect(f.saved === null || f.saved.sessionId !== erased).toBe(true);
    expect(wiped).toEqual([erased]);
  });

  it("a crashing renderer still persists the step: a latched P0 survives the reload that follows (L11)", async () => {
    const g = globalThis as { document?: unknown };
    g.document ??= { documentElement: { classList: { remove() {}, add() {} } } }; // fail-to-shell touches <html>
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const f = fakeStore();
    let now = T0;
    const loop = new EngineLoop(f.store, (r) => { if (r.output.card.cardId === "CARD_P0_CALL") throw new Error("render crash"); }, () => now);
    await loop.start();
    for (const a of ["helper", "none"]) { now += 2000; await loop.dispatch({ kind: "tap", cardInstanceId: loop.current!.card!.instanceId, actionId: a }); }
    await loop.flushed();
    expect(f.saved?.p0?.ruleId).toBe("HR-001");
    expect(f.saved?.p0?.latch).toBe(true);
    expect(logged).toHaveBeenCalledWith(expect.objectContaining({ message: "render crash" })); // fail-to-shell path ran
    logged.mockRestore();
  });

  it("writes stay ordered: the stored state is always the latest one", async () => {
    const f = fakeStore({ saveDelayMs: 15 });
    const { loop, tap } = mkLoop(f.store);
    await loop.start();
    for (const a of ["self", "none", "yes"]) await tap(a);
    await loop.flushed();
    expect(f.saved!.seq).toBe(loop.current!.seq);
    expect(f.saved!.signals.responsiveness?.value).toBe("responsive");
  });

  it("a boot read that never settles delays the first card by the budget, never withholds it (R1, read side)", async () => {
    vi.useFakeTimers();
    try {
      const f = fakeStore();
      f.store.loadState = () => new Promise<SessionState | null>(() => {});
      const { loop, renders } = mkLoop(f.store);
      void loop.start(); // never awaited: on a regression it would hang for the suite's 10-minute timeout instead of failing
      await vi.advanceTimersByTimeAsync(BOOT_READ_BUDGET_MS - 1);
      expect(renders).toEqual([]); // meanwhile the static shell (SOS bar, tel:192, static help) is on screen
      await vi.advanceTimersByTimeAsync(1);
      await vi.waitFor(() => expect(renders.length).toBeGreaterThan(0), { timeout: 1000, interval: 10 });
      expect(renders[0]!.output.card.cardId).toBe("CARD_Q_ACTOR");
      expect(loop.current!.status).toBe("active");
    } finally {
      vi.useRealTimers();
    }
  });

  it("a failed boot read starts a fresh session instead of failing to shell", async () => {
    const f = fakeStore();
    f.store.loadState = () => Promise.reject(new Error("unreadable record"));
    const { loop, renders } = mkLoop(f.store);
    await loop.start();
    expect(renders.map((r) => r.output.card.cardId)).toEqual(["CARD_Q_ACTOR"]);
  });

  it("control: a slow read inside the budget still resumes a latched P0", async () => {
    const f = fakeStore();
    const first = mkLoop(f.store);
    await first.loop.start();
    for (const a of ["helper", "none"]) await first.tap(a);
    await first.loop.flushed();
    expect(f.saved?.p0?.latch).toBe(true);
    const load = f.store.loadState;
    f.store.loadState = () => sleep(30).then(load);
    const renders: StepResult[] = [];
    const again = new EngineLoop(f.store, (r) => renders.push(r), () => T0 + 60_000);
    await again.start();
    expect(renders).toHaveLength(1);
    expect(renders[0]!.output.card.cardId).toMatch(/^CARD_P0_/); // a minute later the P0 sequence has moved on, still P0
    expect(again.current!.sessionId).toBe(f.saved!.sessionId);
    expect(again.current!.p0).toMatchObject({ ruleId: "HR-001", latch: true });
  });
});

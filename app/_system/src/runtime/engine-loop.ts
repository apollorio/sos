/**
 * ENGINE LOOP — the impure shell around the pure core.
 * Serializes every input (taps, timers, visibility) through ONE promise chain, so two events
 * can never interleave. Order per step: process (pure) → persist + effects started → render → arm timer
 * → journal → effects awaited (bounded).
 * Persistence runs on its own serialized, time-bounded chain: storage can never hold the card hostage.
 * The boot read is bounded too: a stalled IndexedDB can delay the first card, never withhold it.
 */
import { processEvent, startSession } from "../core/process-event";
import { REG } from "../core/registry";
import type { RawInput } from "../core/domain/events";
import type { SessionState } from "../core/domain/state";
import type { StepResult } from "../core/domain/decision";
import type { Store } from "./storage/session-store";
import { DeadlineScheduler } from "./deadline-scheduler";
import { runEffects } from "./effects";
import { newId, now } from "./clock";
import { emptyJournal, appendEvents, journalStep, type Journal, type JournalEvent } from "../core/journal/journal";
import type { StrategyPriors } from "../core/continuity/types";

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;

/** Each storage operation gets this long; after that the loop moves on (session-store keeps an in-memory mirror). */
export const PERSIST_BUDGET_MS = 1500;
/**
 * The boot read gets longer than a write: resuming a latched P0 is worth a short wait, and the static shell
 * (SOS bar, tel:192, static help) is on screen meanwhile. Past it, or on a failed read, a fresh session starts (L12).
 */
export const BOOT_READ_BUDGET_MS = 3000;
export function bounded<T>(p: Promise<T>, ms: number): Promise<T | undefined> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(undefined), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, () => { clearTimeout(t); resolve(undefined); });
  });
}
export type InputWithoutMeta = DistributiveOmit<RawInput, "id" | "at">;

/** Continuity hooks. Every method is best-effort and runs AFTER the card is on screen (INV-019). */
export interface ContinuityHooks {
  /** Called with the journal events of the step that was just rendered. */
  onJournal?: (evs: JournalEvent[], journal: Journal) => void | Promise<void>;
  /** Priors for the NEXT step (already computed; the loop never waits for them). */
  priors?: () => StrategyPriors | undefined;
  /** "Apagar agora" also erases this episode from the continuity vault (runs after the session store is wiped). */
  onWipe?: (episodeId: string) => void | Promise<void>;
}

export class EngineLoop {
  private state: SessionState | null = null;
  private chain: Promise<void> = Promise.resolve();
  private persistChain: Promise<void> = Promise.resolve();
  private readonly scheduler: DeadlineScheduler;
  private journal: Journal | null = null;
  hooks: ContinuityHooks = {};

  constructor(
    private readonly store: Store,
    private readonly render: (r: StepResult) => void,
    private readonly clock: () => number = now,
  ) {
    this.scheduler = new DeadlineScheduler(() => void this.dispatch({ kind: "runtime", event: "TICK" }), clock);
  }

  get current(): SessionState | null { return this.state; }

  /** `fresh`: after "Apagar agora" the new session must not read anything back from storage. */
  async start(fresh = false): Promise<void> {
    const saved = fresh ? null : ((await bounded(this.store.loadState(), BOOT_READ_BUDGET_MS)) ?? null);
    const input: RawInput = saved && saved.status === "active"
      ? { kind: "runtime", id: newId(), at: this.clock(), event: "APP_VISIBLE" }
      : { kind: "boot", id: newId(), at: this.clock(), sessionId: newId() };
    const r = input.kind === "boot"
      ? startSession(input.sessionId, input.at, REG, { mode: "prod", priors: this.hooks.priors?.() })
      : processEvent(saved!, input, REG, { mode: "prod", priors: this.hooks.priors?.() });
    this.journal = emptyJournal(r.state.sessionId);
    await this.commit(r, saved, input);
  }

  /** Serialized. The returned promise resolves when THIS input has been fully committed. */
  dispatch(input: InputWithoutMeta): Promise<void> {
    this.chain = this.chain.then(async () => {
      if (!this.state) return;
      const raw = { ...input, id: newId(), at: this.clock() } as RawInput;
      const prev = this.state;
      const r = processEvent(prev, raw, REG, { mode: "prod", priors: this.hooks.priors?.() });
      await this.commit(r, prev, raw);
      if (r.state.status === "wiped") await this.start(true); // fresh anonymous session; its writes queue after the wipe
    }).catch((e) => { console.error(e); document.documentElement.classList.remove("js-ok"); }); // fail to shell (L11)
    return this.chain;
  }

  /** Resolves once everything committed so far has reached storage (or used up its time budget). */
  flushed(): Promise<void> { return this.persistChain; }

  private async commit(r: StepResult, prev: SessionState | null, input: RawInput): Promise<void> {
    this.state = r.state;
    const wipe = r.output.effects.some((e) => e.type === "WIPE_STORAGE");
    // Started before rendering so a render failure cannot lose the write or the P0 wake lock; neither blocks the card.
    this.persist(r, wipe);
    const effects = bounded(runEffects(r.output.effects.filter((e) => e.type !== "WIPE_STORAGE"), () => Promise.resolve()), PERSIST_BUDGET_MS);
    this.render(r); // the card (L12)
    this.scheduler.arm(r.output.nextWakeAt);
    this.journalStep(r, prev, input);
    await effects;
  }

  /** Serialized and bounded; never awaited by the decision path. A wipe writes nothing of the erased session. */
  private persist(r: StepResult, wipe: boolean): void {
    const episodeId = r.state.sessionId;
    this.persistChain = this.persistChain.then(async () => {
      if (wipe) {
        await bounded(this.store.wipe(), PERSIST_BUDGET_MS);
        await bounded(Promise.resolve().then(() => this.hooks.onWipe?.(episodeId)), PERSIST_BUDGET_MS);
        return;
      }
      await bounded(this.store.saveState(r.state), PERSIST_BUDGET_MS);
      await bounded(this.store.appendLog(r.log), PERSIST_BUDGET_MS);
    });
  }

  /** Continuity plane: pure derivation right after render; the hook is fire-and-forget (INV-019, L13). */
  private journalStep(r: StepResult, prev: SessionState | null, input: RawInput): void {
    try {
      if (this.journal && this.journal.episodeId === r.state.sessionId) {
        const evs = journalStep(this.journal, prev, r, input, REG);
        this.journal = appendEvents(this.journal, evs);
        if (evs.length) void Promise.resolve(this.hooks.onJournal?.(evs, this.journal)).catch(() => undefined);
      }
    } catch { /* the journal can never break the loop */ }
  }
}

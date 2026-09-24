/**
 * ENGINE LOOP — the impure shell around the pure core.
 * Serializes every input (taps, timers, visibility) through ONE promise chain, so two events
 * can never interleave. Order per step: process (pure) → persist → log → effects → render → arm timer.
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
export type InputWithoutMeta = DistributiveOmit<RawInput, "id" | "at">;

/** Continuity hooks. Every method is best-effort and runs AFTER the card is on screen (INV-019). */
export interface ContinuityHooks {
  /** Called with the journal events of the step that was just rendered. */
  onJournal?: (evs: JournalEvent[], journal: Journal) => void | Promise<void>;
  /** Priors for the NEXT step (already computed; the loop never waits for them). */
  priors?: () => StrategyPriors | undefined;
}

export class EngineLoop {
  private state: SessionState | null = null;
  private chain: Promise<void> = Promise.resolve();
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

  async start(): Promise<void> {
    const saved = await this.store.loadState();
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
      if (r.state.status === "wiped") await this.start(); // fresh anonymous session
    }).catch((e) => { console.error(e); document.documentElement.classList.remove("js-ok"); }); // fail to shell (L11)
    return this.chain;
  }

  private async commit(r: StepResult, prev: SessionState | null, input: RawInput): Promise<void> {
    this.state = r.state;
    await this.store.saveState(r.state);
    await this.store.appendLog(r.log);
    await runEffects(r.output.effects, () => this.store.wipe());
    this.render(r);
    this.scheduler.arm(r.output.nextWakeAt);
    // Continuity plane: strictly after render, never awaited by the caller's card (INV-019, L13).
    try {
      if (this.journal && this.journal.episodeId === r.state.sessionId) {
        const evs = journalStep(this.journal, prev, r, input, REG);
        this.journal = appendEvents(this.journal, evs);
        if (evs.length) void Promise.resolve(this.hooks.onJournal?.(evs, this.journal)).catch(() => undefined);
      }
    } catch { /* the journal can never break the loop */ }
  }
}

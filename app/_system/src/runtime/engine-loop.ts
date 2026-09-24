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

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
export type InputWithoutMeta = DistributiveOmit<RawInput, "id" | "at">;

export class EngineLoop {
  private state: SessionState | null = null;
  private chain: Promise<void> = Promise.resolve();
  private readonly scheduler: DeadlineScheduler;

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
    const r = saved && saved.status === "active"
      ? processEvent(saved, { kind: "runtime", id: newId(), at: this.clock(), event: "APP_VISIBLE" }, REG, { mode: "prod" })
      : startSession(newId(), this.clock(), REG, { mode: "prod" });
    await this.commit(r);
  }

  /** Serialized. The returned promise resolves when THIS input has been fully committed. */
  dispatch(input: InputWithoutMeta): Promise<void> {
    this.chain = this.chain.then(async () => {
      if (!this.state) return;
      const r = processEvent(this.state, { ...input, id: newId(), at: this.clock() } as RawInput, REG, { mode: "prod" });
      await this.commit(r);
      if (r.state.status === "wiped") await this.start(); // fresh anonymous session
    }).catch((e) => { console.error(e); document.documentElement.classList.remove("js-ok"); }); // fail to shell (L11)
    return this.chain;
  }

  private async commit(r: StepResult): Promise<void> {
    this.state = r.state;
    await this.store.saveState(r.state);
    await this.store.appendLog(r.log);
    await runEffects(r.output.effects, () => this.store.wipe());
    this.render(r);
    this.scheduler.arm(r.output.nextWakeAt);
  }
}

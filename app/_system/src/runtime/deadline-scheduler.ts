/**
 * ONE timer, armed at output.nextWakeAt. Timers are hints (browsers throttle them in background);
 * correctness never depends on them because the core re-derives everything from timestamps (L06).
 */
export class DeadlineScheduler {
  private handle: ReturnType<typeof setTimeout> | null = null;
  constructor(private readonly fire: () => void, private readonly clock: () => number) {}

  arm(at: number | null): void {
    if (this.handle) clearTimeout(this.handle);
    this.handle = null;
    if (at === null) return;
    const delay = Math.min(Math.max(at - this.clock() + 50, 250), 60_000); // re-check at least every 60s while visible
    this.handle = setTimeout(() => this.fire(), delay);
  }
}

/** Executes the core's declarative effects. Every effect is best-effort and may fail silently. */
import type { Effect } from "../core/domain/decision";

let wakeLock: { release(): Promise<void> } | null = null;

export async function runEffects(effects: Effect[], wipe: () => Promise<void>): Promise<void> {
  for (const e of effects) {
    try {
      if (e.type === "VIBRATE") navigator.vibrate?.(e.pattern);
      else if (e.type === "WIPE_STORAGE") await wipe();
      else if (e.type === "KEEP_AWAKE") {
        // P0: keep the screen on so a bystander can read it (Screen Wake Lock API, where supported).
        const nav = navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<{ release(): Promise<void> }> } };
        if (e.on && !wakeLock && nav.wakeLock) wakeLock = await nav.wakeLock.request("screen");
        if (!e.on && wakeLock) { await wakeLock.release(); wakeLock = null; }
      }
    } catch { /* never let an effect break the loop */ }
  }
}

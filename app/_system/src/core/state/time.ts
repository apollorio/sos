/**
 * TIME MODEL — timers are hints, deadlines are truth.
 *
 * The browser throttles/suspends timers in background tabs, so the core never trusts that a
 * timer fired "on time". Every step recomputes silence from (visibility, windowStart, now).
 * Three distinct kinds of "nothing happened" are never mixed (brainstorm §9):
 *   SILENCE            visible + awaiting + no human input for afterSec
 *   APP_UNAVAILABLE    hidden/suspended → no silence accrues; on return → resumedAfterGap
 *   CONNECTIVITY_LOST  only affects strategies that require network
 */
import type { Reg } from "../registry";
import type { SessionState } from "../domain/state";
import type { Band } from "../../generated/registry.gen";

export function silenceAfterMs(band: Band | null, reg: Reg): number | null {
  if (!band) return null;
  const s = reg.data.silence[band];
  return s ? s.afterSec * 1000 : null;
}

export function onHumanInput(state: SessionState, now: number): void {
  state.lastHumanAt = now;
  state.silence = { count: 0, windowStart: now };
  state.flags.resumedAfterGap = false;
}

export function accrueSilence(state: SessionState, now: number, reg: Reg): void {
  const after = silenceAfterMs(state.shownBand, reg);
  if (after === null || !state.card || !state.visibility.visible) return;
  const start = Math.max(state.silence.windowStart, state.visibility.since);
  if (start !== state.silence.windowStart) state.silence.windowStart = start;
  while (state.silence.count < reg.data.silence.maxCount && now - state.silence.windowStart >= after) {
    state.silence.count += 1;
    state.silence.windowStart += after;
  }
}

export function nextSilenceDeadline(state: SessionState, reg: Reg): number | null {
  const after = silenceAfterMs(state.shownBand, reg);
  if (after === null || !state.card || !state.visibility.visible) return null;
  if (state.silence.count >= reg.data.silence.maxCount) return null;
  return state.silence.windowStart + after;
}

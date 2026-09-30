/**
 * AMBIENT BREATH (L27) — the slow orb behind every non-P0 card. It paces the breath (in · hold · out) with one short
 * line, all the time, without taking a card's place. It is decoration with a purpose, never a gate: it has no buttons,
 * it ignores the pointer, and it disappears when the engine sends no `breath` (P0, abnormal breathing, not responsive).
 * One node per root, kept across renders, so the rhythm never restarts when the card changes.
 */
import type { Output } from "../core/domain/decision";
import type { Locale } from "./locale";

interface Orb { layer: HTMLElement; ball: HTMLElement; label: HTMLElement; timer: ReturnType<typeof setTimeout> | null; key: string }
/** The orb (behind the card) and its one-line guide (a pill above everything but the 192 bar). */
export type AmbientNodes = [HTMLElement, HTMLElement];
const ORBS = new WeakMap<HTMLElement, Orb>();

export function ambientBreath(root: HTMLElement, breath: Output["breath"], locale: Locale): AmbientNodes {
  let orb = ORBS.get(root);
  if (!orb) {
    const layer = document.createElement("div");
    layer.className = "ambient-breath";
    layer.setAttribute("aria-hidden", "true");
    const ball = document.createElement("div");
    ball.className = "orb";
    const label = document.createElement("p");
    label.className = "breath-line";
    label.setAttribute("aria-hidden", "true");
    layer.append(ball);
    orb = { layer, ball, label, timer: null, key: "" };
    ORBS.set(root, orb);
  }
  const o = orb;
  const key = breath ? `${breath.inhaleSec}/${breath.holdSec}/${breath.exhaleSec}` : "";
  o.layer.classList.toggle("on", !!breath);
  o.label.classList.toggle("on", !!breath);
  const nodes: AmbientNodes = [o.layer, o.label];
  if (key === o.key) return nodes; // same rhythm: keep breathing, do not restart
  o.key = key;
  if (o.timer) clearTimeout(o.timer);
  o.timer = null;
  if (!breath) return nodes;
  const phases: [string, number, string][] = [
    [locale.shell["breathIn"] ?? "Inspira..", breath.inhaleSec, "scale(1)"],
    ...(breath.holdSec ? [[locale.shell["breathHold"] ?? "Segura..", breath.holdSec, "scale(1)"] as [string, number, string]] : []),
    [locale.shell["breathOut"] ?? "Solta devagar..", breath.exhaleSec, "scale(0.5)"],
  ];
  let i = 0;
  const step = () => {
    if (o.key !== key) return;
    const [text, sec, transform] = phases[i % phases.length]!;
    o.label.textContent = text;
    o.ball.style.transitionDuration = `${sec}s`;
    o.ball.style.transform = transform;
    i += 1;
    o.timer = setTimeout(step, sec * 1000);
  };
  requestAnimationFrame(step);
  return nodes;
}

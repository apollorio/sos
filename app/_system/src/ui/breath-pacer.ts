/**
 * Breath pacer — the "human step" micro-game. A calming interaction (inhale 4s / exhale 6s),
 * NEVER a gate: the card's buttons are always enabled (L12).
 */
export function mountBreathPacer(host: HTMLElement): void {
  const wrap = document.createElement("div");
  wrap.className = "pacer";
  wrap.setAttribute("aria-hidden", "true");
  const dot = document.createElement("div");
  dot.className = "pacer-dot";
  const label = document.createElement("div");
  label.className = "pacer-label";
  wrap.append(dot, label);
  host.append(wrap);
  let inhale = true;
  const step = () => {
    if (!wrap.isConnected) return;
    label.textContent = inhale ? "puxa…" : "solta…";
    dot.style.transitionDuration = inhale ? "4s" : "6s";
    dot.style.transform = inhale ? "scale(1)" : "scale(0.45)";
    const d = inhale ? 4000 : 6000;
    inhale = !inhale;
    setTimeout(step, d);
  };
  requestAnimationFrame(step);
}

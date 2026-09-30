/**
 * CHROME — everything around the engine's card: the CardNav menu (Apollo DS, CSS engine), the elapsed counter,
 * text size, ambient sound, focus mode, and "Compartilhar relatório". Dumb: it never decides help.
 * The only thing it hands the engine is the same shell action as the red 192 bar (menu → "Chamar SAMU agora").
 * Text size and volume are per-device conveniences in localStorage (no person, no crisis data).
 */
import type { EngineLoop } from "../runtime/engine-loop";
import type { Reg } from "../core/registry";
import type { Locale } from "./locale";
import { handoffHref } from "./locale";
import { buildCrisisSummary, renderSummary } from "../core/handoff/summary";
import { fmtCounter } from "../report/model";

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s);
const store = {
  get(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string): void { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

let toastTimer: ReturnType<typeof setTimeout> | null = null;
export function toast(text: string, ms = 2400): void {
  const t = $("#toast");
  if (!t) return;
  t.textContent = text;
  t.classList.add("on");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("on"), ms);
}

/* ── CardNav: ghost bar, burger at the far right, glass cards on open (DS NavCards, CSS path) ── */
function cardNav(onOpen: () => void): { refit(): void } {
  const nav = $("#cardNav"), burger = $("#burger"), content = $("#navContent");
  if (!nav || !burger || !content) return { refit() {} };
  const BAR = 56;
  let open = false;
  const cards = Array.from(content.querySelectorAll<HTMLElement>(".nav-card, .nav-controls"));
  const target = () => {
    const prev = content.style.cssText;
    content.style.cssText = "visibility:hidden;position:static;height:auto";
    const hgt = BAR + content.scrollHeight + 4;
    content.style.cssText = prev;
    const top = Math.max(0, nav.getBoundingClientRect().top);
    return Math.min(hgt, window.innerHeight - top - 8);
  };
  const set = (v: boolean) => {
    if (v === open) return;
    open = v;
    burger.setAttribute("aria-expanded", v ? "true" : "false");
    burger.setAttribute("aria-label", v ? "Fechar menu" : "Abrir menu");
    content.setAttribute("aria-hidden", v ? "false" : "true");
    document.body.classList.toggle("menu-open", v);
    cards.forEach((c, i) => { c.style.transitionDelay = v ? `${0.12 + i * 0.07}s` : "0s"; });
    nav.classList.toggle("card-nav--open", v);
    nav.style.height = `${v ? target() : BAR}px`;
    if (v) onOpen();
  };
  burger.addEventListener("click", (e) => { e.stopPropagation(); set(!open); });
  content.addEventListener("click", (e) => { const a = (e.target as HTMLElement).closest("a"); if (a && !a.hasAttribute("data-soon")) set(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) { set(false); burger.focus(); } });
  document.addEventListener("pointerdown", (e) => { if (open && !nav.contains(e.target as Node)) set(false); });
  window.addEventListener("resize", () => { if (open) nav.style.height = `${target()}px`; });
  return { refit: () => { if (open) nav.style.height = `${target()}px`; } };
}

/* ── Text size: reading surfaces follow --fs-scale (see app.css) ── */
function textSize(refit: () => void): void {
  const STEPS = [0.9, 1, 1.1, 1.2, 1.3, 1.4];
  let i = Math.max(0, STEPS.indexOf(parseFloat(store.get("sos_font_scale") ?? "1")));
  const up = $<HTMLButtonElement>("#fs-up"), down = $<HTMLButtonElement>("#fs-down"), read = $("#fs-read");
  const apply = () => {
    const v = STEPS[i]!;
    document.documentElement.style.setProperty("--fs-scale", String(v));
    if (read) read.textContent = `${Math.round(v * 100)}%`;
    if (down) down.disabled = i === 0;
    if (up) up.disabled = i === STEPS.length - 1;
    store.set("sos_font_scale", String(v));
    requestAnimationFrame(refit);
  };
  up?.addEventListener("click", () => { if (i < STEPS.length - 1) { i++; apply(); } });
  down?.addEventListener("click", () => { if (i > 0) { i--; apply(); } });
  apply();
}

/* ── Ambient sound: never autoplays; the first tap starts a slow fade, the menu pauses / sets volume ── */
function ambient(): void {
  const audio = $<HTMLAudioElement>("#relaxAudio"), btn = $("#btn-audio"), range = $<HTMLInputElement>("#nav-vol");
  if (!audio) return;
  const saved = parseFloat(store.get("sos_volume") ?? "");
  let target = Number.isFinite(saved) ? Math.min(1, Math.max(0, saved)) : 0.95;
  let playing = false, fade: ReturnType<typeof setInterval> | null = null;
  const ramp = (to: number, sec: number, done?: () => void) => {
    if (fade) clearInterval(fade);
    const from = audio.volume, steps = Math.max(1, Math.round(sec * 20));
    let n = 0;
    fade = setInterval(() => {
      n++;
      audio.volume = Math.min(1, Math.max(0, from + ((to - from) * n) / steps));
      if (n >= steps) { if (fade) clearInterval(fade); fade = null; done?.(); }
    }, 50);
  };
  const paint = () => {
    btn?.setAttribute("aria-pressed", playing ? "true" : "false");
    btn?.setAttribute("aria-label", playing ? "Pausar som ambiente" : "Tocar som ambiente");
  };
  // The file is on an external host: if it is missing or blocked, the control goes quiet instead of retrying.
  let unavailable = false;
  const giveUp = () => {
    unavailable = true; playing = false; paint();
    if (btn instanceof HTMLButtonElement) { btn.disabled = true; btn.setAttribute("aria-label", "Som ambiente indisponível"); }
  };
  audio.addEventListener("error", giveUp);
  const play = () => {
    if (unavailable) return;
    audio.volume = 0;
    audio.play().then(() => { playing = true; paint(); ramp(target, 12); }).catch(() => { if (audio.error) giveUp(); else { playing = false; paint(); } });
  };
  const pause = () => { playing = false; paint(); ramp(0, 2.2, () => audio.pause()); };
  btn?.addEventListener("click", (e) => { e.stopPropagation(); if (playing) pause(); else play(); });
  if (range) {
    range.value = String(Math.round(target * 100));
    const show = () => { range.style.setProperty("--vol", `${range.value}%`); range.setAttribute("aria-valuetext", `${range.value}%`); };
    show();
    range.addEventListener("input", () => {
      target = Math.min(1, Math.max(0, Number(range.value) / 100));
      store.set("sos_volume", String(target));
      show();
      if (playing) { if (fade) clearInterval(fade); fade = null; audio.volume = target; }
    });
  }
  // Same as the previous page: sound begins only after the person's first tap, fading in over 12 s.
  const first = (e: Event) => {
    const t = e.target as HTMLElement | null;
    if (t && t.closest("#btn-audio, #nav-vol")) return;
    if (!playing) play();
  };
  document.addEventListener("pointerdown", first, { once: true, passive: true });
  paint();
}

/* ── Focus mode: fullscreen, quieter chrome ── */
function focusMode(): void {
  const btn = $("#btn-zen");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const on = !document.body.classList.contains("zen");
    document.body.classList.toggle("zen", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "Sair do modo foco" : "Entrar no modo foco");
    try {
      if (on && !document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => undefined);
      if (!on && document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
    } catch { /* not allowed here: the quieter chrome still applies */ }
  });
}

export function attachChrome(loop: EngineLoop, reg: Reg, locale: Locale): void {
  const elapsed = $("#nav-elapsed");
  let ticker: ReturnType<typeof setInterval> | null = null;
  const tick = () => {
    const s = loop.current;
    if (elapsed && s) elapsed.textContent = fmtCounter(Date.now() - s.startedAt);
    if (!document.body.classList.contains("menu-open") && ticker) { clearInterval(ticker); ticker = null; }
  };
  const nav = cardNav(() => { tick(); if (!ticker) ticker = setInterval(tick, 1000); });
  textSize(nav.refit);
  ambient();
  focusMode();

  // Rede de apoio: the same trusted message the engine uses (locale), and the same shell action as the 192 bar.
  const wa = $<HTMLAnchorElement>("#nav-whatsapp");
  if (wa) { try { wa.href = handoffHref({ channel: "whatsapp", target: "trusted" }, locale, reg); } catch { /* keep the static link */ } }
  $("#nav-192")?.addEventListener("click", () => void loop.dispatch({ kind: "shell", action: "call_192" }));

  // Compartilhar relatório: the friend view of the Crisis Passport (no exposure context), shared only on this tap.
  $("#nav-share")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const j = loop.episodeJournal, s = loop.current;
    if (!j || !s) return;
    const text = renderSummary(buildCrisisSummary(j.events, j.episodeId, { audience: "trusted_person", now: Date.now() }, reg), locale.continuity, -new Date().getTimezoneOffset());
    const R = locale.continuity.report;
    if (typeof navigator.share === "function") { try { await navigator.share({ title: R["relBrand"], text }); return; } catch { /* cancelled: fall back to copy */ } }
    try { await navigator.clipboard.writeText(text); toast(R["relShared"] ?? ""); } catch { toast(R["btnCopyFail"] ?? ""); }
  });

  document.querySelectorAll<HTMLAnchorElement>(".nav-card-link[data-soon]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    toast(locale.shell["soon"] ?? "");
  }));
}

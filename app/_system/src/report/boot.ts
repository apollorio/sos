/**
 * REPORT BOOT — entry of app/medico.html (Modo Médico) and app/relatorio.html (Relatório de Emergência).
 * Live by default: reads this device's current episode and follows it in real time while the app is open.
 * Lab: `?cenario=<name>` shows a golden scenario replayed by the real engine (app/lab/cenarios.json).
 * Nothing is sent anywhere. Copy / share / print are explicit taps.
 */
import { REG } from "../core/registry";
import { LOCALES } from "../ui/locale";
import { buildView, type Episode } from "./model";
import { renderMedico, renderRelatorio, renderMessage, h } from "./render";
import { readLive, subscribeLive, loadLab, type Snapshot, type LabScenario } from "./source";

const loc = LOCALES[REG.data.meta.defaultLocale]!;
const R = loc.continuity.report;
const page: "medico" | "relatorio" = document.body.dataset["page"] === "relatorio" ? "relatorio" : "medico";
const host = document.getElementById("doc");
const status = document.getElementById("live-status");
const tz = -new Date().getTimezoneOffset();
const params = new URLSearchParams(location.search);
const RETENTION_H = REG.data.storage.retentionHours;

let live: Snapshot | null = null;
let wiped = false;
let labList: LabScenario[] = [];
let lab: LabScenario | null = null;
let copyText = "";

/** After "Apagar agora" the app starts a fresh, empty session: keep saying "apagado" until the person tells it something. */
const humanSaid = (s: Snapshot) => s.events.some((e) => e.origin === "self" || e.origin === "helper");

function draw(): void {
  if (!host) return;
  let ep: Episode | null = null;
  if (live && wiped && humanSaid(live)) wiped = false;
  if (lab) ep = { episodeId: lab.episodeId, events: lab.events, state: lab.state, now: lab.now, tz: -180, source: "lab" };
  else if (live && !wiped) ep = { episodeId: live.episodeId, events: live.events, state: live.state, now: Date.now(), tz, source: "live" };
  if (!ep) {
    renderMessage(host, wiped ? R["wiped"]! : R["waiting"]!);
    copyText = "";
    if (status) status.textContent = "";
    document.documentElement.classList.remove("has-episode");
    return;
  }
  const v = buildView(ep, REG, loc);
  if (page === "medico") { renderMedico(host, v.medico, R, ep.source === "lab" ? R["labLabel"]! : R["liveLabel"]!); copyText = v.medico.copyText; }
  else { renderRelatorio(host, v.relatorio, R); copyText = v.relatorio.shareText; }
  document.documentElement.classList.add("has-episode");
  if (status) {
    status.replaceChildren(ep.source === "live" ? h("span", "dot", "") : "", ep.source === "live" ? `${R["liveDot"]} · ${v.medico.header.updatedLine}` : `${R["labLabel"]} · ${lab?.title ?? ""}`);
  }
}

async function refreshLive(): Promise<void> {
  if (lab) return;
  const s = await readLive(RETENTION_H, Date.now());
  if (s) live = s;
  else if (live && live.state && Date.now() - live.state.lastAt > RETENTION_H * 3_600_000) live = null;
  draw();
}

function flash(btn: HTMLElement, text: string): void {
  const old = btn.textContent;
  btn.textContent = text;
  setTimeout(() => { btn.textContent = old; }, 1600);
}

async function copyOrShare(btn: HTMLElement): Promise<void> {
  if (!copyText) return;
  if (page === "relatorio" && typeof navigator.share === "function") {
    try { await navigator.share({ title: R["relBrand"], text: copyText }); return; } catch { /* cancelled or unsupported: fall back to copy */ }
  }
  try { await navigator.clipboard.writeText(copyText); flash(btn, page === "relatorio" ? R["relShared"]! : R["btnCopied"]!); }
  catch { flash(btn, R["btnCopyFail"]!); }
}

function wire(): void {
  document.getElementById("btn-print")?.addEventListener("click", () => window.print());
  const copy = document.getElementById("btn-copy");
  copy?.addEventListener("click", () => void copyOrShare(copy));
}

async function setupLab(): Promise<void> {
  const wanted = params.get("cenario");
  if (wanted === null && !params.has("lab")) return;
  labList = await loadLab("./lab/cenarios.json");
  const pick = document.getElementById("scenario") as HTMLSelectElement | null;
  if (pick && labList.length) {
    pick.replaceChildren(h("option", null, R["scenarioLive"]!), ...labList.map((s) => { const o = h("option", null, s.title) as HTMLOptionElement; o.value = s.name; return o; }));
    (pick.firstChild as HTMLOptionElement).value = "";
    pick.closest(".scenario")?.classList.remove("hidden");
    pick.addEventListener("change", () => {
      lab = labList.find((s) => s.name === pick.value) ?? null;
      const u = new URL(location.href);
      if (lab) u.searchParams.set("cenario", lab.name); else u.searchParams.delete("cenario");
      history.replaceState(null, "", u);
      if (lab) draw(); else void refreshLive();
    });
  }
  lab = labList.find((s) => s.name === wanted) ?? null;
  if (pick && lab) pick.value = lab.name;
}

async function main(): Promise<void> {
  wire();
  await setupLab();
  draw();
  if (!lab) await refreshLive();
  subscribeLive((s) => {
    if (s === "wiped") { live = null; wiped = true; }
    else live = s;
    if (!lab) draw();
  });
  // Fallback when BroadcastChannel is missing or the app is closed: re-read the local store while visible.
  setInterval(() => { if (!document.hidden && !lab) void refreshLive(); }, 5000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !lab) void refreshLive(); });
}

// One report per page: the module bundle (http) or its classic copy (file://, see app/file-boot.js) — never both.
const w = window as unknown as { __sosReport?: boolean };
if (!w.__sosReport) { w.__sosReport = true; void main(); }

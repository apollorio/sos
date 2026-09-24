/**
 * ENGINEERING SIMULATOR — the real engine + the real renderer, with:
 *   · a virtual clock (fast-forward time, leave the app, stay silent)
 *   · handoffs neutralized (nothing is ever dialed or sent from the simulator)
 *   · a "brain" panel: band, commanding rule, VOI class of every question, signals with age, commitments
 *   · autoplay of the golden scenarios
 */
import { REG } from "../core/registry";
import { LOCALES } from "../ui/locale";
import { renderStep } from "../ui/render";
import { EngineLoop } from "../runtime/engine-loop";
import type { Store } from "../runtime/storage/session-store";
import type { StepResult, LogEntry } from "../core/domain/decision";
import type { SessionState } from "../core/domain/state";
import { buildFacts } from "../core/logic/facts";
import { decideCore } from "../core/planner/decide";
import { askable, rankQuestions } from "../core/planner/voi";
import { SCENARIOS, type Step } from "../../tests/scenarios/scenarios";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const locale = LOCALES["pt-BR"]!;
let offset = 0;
const clock = () => Date.now() + offset;
let t0 = clock();
const history: { at: number; log: LogEntry; title: string }[] = [];

const memStore = (): Store => {
  let st: SessionState | null = null;
  return {
    loadState: async () => st,
    saveState: async (s) => { st = s; },
    appendLog: async () => undefined,
    readLogs: async () => [],
    wipe: async () => { st = null; },
  };
};

const fmt = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const esc = (x: unknown) => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function toast(msg: string) {
  const el = $("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout((el as unknown as { _t?: number })._t);
  (el as unknown as { _t?: number })._t = window.setTimeout(() => (el.hidden = true), 3200);
}

function renderBrain(r: StepResult) {
  const s = r.state;
  const now = s.lastAt;
  const { facts, risk } = buildFacts(s, now, REG);
  const why = r.log.why;
  const band = r.log.band;

  // Header
  $("b-band").textContent = band;
  $("b-band").dataset["band"] = band;
  $("b-clock").textContent = `t+${fmt(now - t0)}`;
  const rule = why.commander ?? why.policyRule ?? "—";
  $("b-rule").textContent = rule;
  $("b-bandrule").textContent = why.commander ? "hard rule · first match wins" : `${why.bandRule ?? ""}${why.heldByHysteresis ? " · held by hysteresis" : ""}`;
  $("b-skill").textContent = `${r.output.card.skill}${r.output.card.strategy ? "." + r.output.card.strategy : ""}`;
  $("b-because").innerHTML = why.because.map((l) => `<li><code>${esc(l.path)}</code> <span class="op">${esc(l.op)}</span> ${l.expected === null ? "" : `<code>${esc(JSON.stringify(l.expected))}</code>`}</li>`).join("") || "<li>—</li>";

  // Risk vector
  $("b-risk").innerHTML = Object.entries(risk).map(([d, v]) =>
    `<div class="risk-row"><span>${esc(d)}</span><span class="meter" aria-label="${v} de 4">${[0, 1, 2, 3].map((i) => `<i class="${i < v ? "on" : ""}"></i>`).join("")}</span><b>${v}</b></div>`).join("");

  // VOI table (the Akinator part)
  const rows: string[] = [];
  if (band !== "P0" && s.band && facts["signal.actor"] !== "unknown") {
    const b = s.band.current;
    const base = decideCore(s, now, REG, false);
    const ranked = rankQuestions(s, facts, b, base, now, REG, (x, t, rg) => decideCore(x, t, rg, true));
    for (const q of REG.data.questions) {
      if (q.prerequisite) continue;
      const a = askable(q, s, facts, b, now, REG);
      const hit = ranked.find((x) => x.q.id === q.id);
      const cls = !a ? "known" : hit ? hit.cls : "irrelevant";
      rows.push(`<tr class="voi-${cls}"><td><code>${q.id}</code></td><td>${{ known: "já sabido ou não se aplica", irrelevant: "irrelevante agora", critical: "CRÍTICA · pode revelar P0", decisive: "decisiva · muda a ação" }[cls]}</td></tr>`);
    }
  } else rows.push(`<tr><td colspan="2">${band === "P0" ? "P0 não pergunta nada (L05)." : "Aguardando quem precisa de ajuda."}</td></tr>`);
  $("b-voi").innerHTML = rows.join("");

  // Signals
  $("b-signals").innerHTML = REG.data.signals.map((d) => {
    const rec = (s.signals as Record<string, { value: unknown; source: string; observedAt: number; expiresAt: number | null } | undefined>)[d.id];
    const latched = rec && d.latched.includes(rec.value as never);
    const ttl = rec ? (rec.expiresAt === null ? (latched ? "travado" : "∞") : fmt(rec.expiresAt - now)) : "";
    return `<tr class="${rec ? "" : "dim"}"><td><code>${d.id}</code></td><td>${rec ? esc(rec.value) : "unknown"}</td><td>${rec ? esc(rec.source.replace("_", " ")) : ""}</td><td class="num">${ttl}</td></tr>`;
  }).join("");

  // Commitments + time
  const pend = s.commitments.filter((c) => c.status === "pending");
  $("b-commit").innerHTML = pend.length ? pend.map((c) => `<li><code>${c.kind}</code> vence em <b>${fmt(c.dueAt - now)}</b>${c.snoozes ? ` · adiado ${c.snoozes}×` : ""}</li>`).join("") : "<li class='dim'>nenhum</li>";
  $("b-time").textContent = `silêncio ${s.silence.count}/${REG.data.silence.maxCount} · app ${s.visibility.visible ? "visível" : "em 2º plano"} · ${s.connectivity} · próximo despertar ${r.output.nextWakeAt ? "em " + fmt(r.output.nextWakeAt - now) : "—"}`;

  // Timeline
  history.push({ at: now, log: r.log, title: r.output.card.cardId });
  $("b-timeline").innerHTML = history.slice(-40).reverse().map((h) =>
    `<li><span class="t num">t+${fmt(h.at - t0)}</span><span class="pill" data-band="${h.log.band}">${h.log.band}</span><span class="in">${esc(h.log.input.replace(/\s\[.*\]$/, ""))}</span><span class="out"><code>${esc(h.log.why.commander ?? h.log.why.policyRule ?? "")}</code> → ${esc(h.title.replace("CARD_", ""))}</span></li>`).join("");
}

let loop: EngineLoop;

async function boot() {
  const phone = $("phone-screen");
  loop = new EngineLoop(memStore(), (r) => {
    renderStep(phone, r, locale, REG, {
      tap: (i, a) => void loop.dispatch({ kind: "tap", cardInstanceId: i, actionId: a }),
      text: (text) => void loop.dispatch({ kind: "text", text }),
      chip: (chipId) => void loop.dispatch({ kind: "chip", chipId }),
    });
    renderBrain(r);
  }, clock);
  await loop.start();
}

// Neutralize every handoff: this is a simulator.
document.addEventListener("click", (ev) => {
  const a = (ev.target as HTMLElement).closest("a");
  if (!a) return;
  const href = a.getAttribute("href") ?? "";
  if (/^(tel:|sms:|https:\/\/wa\.me)/.test(href)) {
    ev.preventDefault();
    const what = href.startsWith("tel:") ? `o discador com ${href.slice(4)}` : href.startsWith("sms:") ? "o SMS com a mensagem pronta" : "o WhatsApp com a mensagem pronta";
    toast(`No app real, isto abriria ${what}. No simulador nada é discado nem enviado.`);
  }
}, true);

$("sos-demo").addEventListener("click", () => { toast("No app real, esta barra é um link tel:192 em HTML puro, que funciona mesmo sem JavaScript. Aqui nada é discado."); void loop.dispatch({ kind: "shell", action: "call_192" }); });

const advance = async (sec: number) => { offset += sec * 1000; await loop.dispatch({ kind: "runtime", event: "TICK" }); };
$("c-1m").addEventListener("click", () => void advance(60));
$("c-5m").addEventListener("click", () => void advance(300));
$("c-bg").addEventListener("click", async () => {
  await loop.dispatch({ kind: "runtime", event: "APP_HIDDEN" });
  offset += 300_000;
  await loop.dispatch({ kind: "runtime", event: "TICK" });
  await loop.dispatch({ kind: "runtime", event: "APP_VISIBLE" });
  toast("Saiu do app por 5 min e voltou: isso NÃO conta como silêncio (L06).");
});
const offBtn = $("c-net") as HTMLButtonElement;
offBtn.addEventListener("click", async () => {
  const off = offBtn.getAttribute("aria-pressed") !== "true";
  offBtn.setAttribute("aria-pressed", String(off));
  offBtn.textContent = off ? "Voltar online" : "Ficar offline";
  await loop.dispatch({ kind: "runtime", event: off ? "OFFLINE" : "ONLINE" });
});
$("c-reset").addEventListener("click", async () => { await reset(); });

async function reset() {
  offset = 0;
  t0 = clock();
  history.length = 0;
  offBtn.setAttribute("aria-pressed", "false");
  offBtn.textContent = "Ficar offline";
  await boot();
}

// Scenario autoplay
const sel = $("c-scn") as HTMLSelectElement;
for (const sc of SCENARIOS.filter((x) => !x.steps.some((st) => "tapOld" in st))) {
  const o = document.createElement("option");
  o.value = sc.name;
  o.textContent = sc.name;
  o.title = sc.doc;
  sel.append(o);
}
let playing = false;
$("c-play").addEventListener("click", async () => {
  const sc = SCENARIOS.find((x) => x.name === sel.value);
  if (!sc || playing) return;
  playing = true;
  $("scn-doc").textContent = sc.doc;
  await reset();
  for (const step of sc.steps as Step[]) {
    await new Promise((r) => setTimeout(r, 900));
    offset += ((step.after ?? 2) * 1000);
    const card = loop.current?.card;
    if (!card) break;
    if ("answer" in step) await loop.dispatch({ kind: "tap", cardInstanceId: card.instanceId, actionId: step.answer });
    else if ("tap" in step) await loop.dispatch({ kind: "tap", cardInstanceId: card.instanceId, actionId: step.tap });
    else if ("text" in step) await loop.dispatch({ kind: "text", text: step.text });
    else if ("runtime" in step) await loop.dispatch({ kind: "runtime", event: step.runtime });
    else if ("shell" in step) await loop.dispatch({ kind: "shell", action: "call_192" });
    else if ("chip" in step) await loop.dispatch({ kind: "chip", chipId: step.chip });
  }
  playing = false;
});
sel.addEventListener("change", () => { $("scn-doc").textContent = SCENARIOS.find((x) => x.name === sel.value)?.doc ?? ""; });
$("scn-doc").textContent = SCENARIOS.find((x) => x.name === sel.value)?.doc ?? "";

void boot();

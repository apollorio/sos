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
import type { Journal, JournalEvent } from "../core/journal/journal";
import { memoryVaultStore } from "../runtime/continuity/journal-store";
import { deriveSnapshot } from "../core/continuity/snapshot";
import { strategyPriors } from "../core/continuity/priors";
import { purgeExpired } from "../core/continuity/retention";
import type { ContinuitySnapshot, StrategyPriors } from "../core/continuity/types";
import { buildCrisisSummary, renderSummary, findForbiddenTerms } from "../core/handoff/summary";
import { newCapsule, capsuleLink, parseCapsuleLink } from "../core/handoff/capsule";
import { sealCapsule, openCapsule, newCapsuleId } from "../runtime/handoff/capsule-crypto";
import { synthHistory } from "./history-fixture";

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

/** Plain words for what was recorded (one value can come from several buttons, e.g. «Bala + álcool» and «Só bala»). */
const SAID: Record<string, Record<string, string>> = {
  substanceClass: { stim: "estimulante (bala, MD ou pó)", downer: "depressor (G, calmante, remédio ou álcool)", psychedelic: "psicodélico / dissociativo", none: "nada" },
  substance: { md: "bala / MD", coke: "pó (cocaína)", ghb: "G (GHB/GBL)", downer_pill: "calmante, remédio ou opioide", alcohol: "só álcool", lsd: "ácido ou cogumelo", ket: "ket", cannabis: "erva", inhalant: "lança ou loló" },
  alcohol: { yes: "sim", no: "não" },
  sexEnhancer: { pill: "azulzinho", poppers: "poppers", both: "azulzinho + poppers", none: "nada disso" },
  discomfort: { nose: "nariz ardendo", throat: "garganta ardendo", heat: "muito calor", nausea: "enjoo", jaw: "mandíbula travando" },
};
function saidAs(signal: string, value: unknown): string {
  if (value === "unknown" || value === undefined) return "<span class='dim'>ainda não sabido</span>";
  return `<b>${esc(SAID[signal]?.[String(value)] ?? String(value))}</b>`;
}

function pistaRows(s: StepResult["state"], facts: Record<string, unknown>): [string, string, string][] {
  const phrase = (k: string) => locale.continuity?.strategyPhrases?.[k] ?? k;
  const shown = (skill: string) => REG.data.skills.find((x) => x.id === skill)!.strategies
    .filter((st) => (s.strategies[`${skill}.${st.id}`]?.shows ?? 0) > 0)
    .map((st) => `${esc(phrase(`${skill}.${st.id}`))}${s.strategies[`${skill}.${st.id}`]?.doneAt != null ? " ✔" : ""}`);
  const mixing = Number(facts["risk.mixing"] ?? 0);
  const mixNote = ["nenhuma mistura conhecida", "", "mistura que pesa (faixa P2 no mínimo)", "mistura perigosa (faixa P1)", ""][mixing] ?? "";
  const next = ["Q_SUBSTANCE", "Q_WHICH_STIM", "Q_WHICH_DOWNER", "Q_WHICH_PSY", "Q_ALCOHOL", "Q_SEX", "Q_BODY"].find((id) => {
    const q = REG.question.get(id)!;
    return s.band ? !!askable(q, s, facts as never, s.band.current, s.lastAt, REG) : false;
  });
  return [
    ["Usou", saidAs("substanceClass", facts["signal.substanceClass"]), "O que você usou? (1 toque)"],
    ["Qual", saidAs("substance", facts["signal.substance"]), "Qual deles? Teve álcool junto? (mesmo toque responde o álcool)"],
    ["Álcool junto", saidAs("alcohol", facts["signal.alcohol"]), facts["signal.alcohol"] === "no" ? "escolheu «Só …» quando havia «+ álcool»" : ""],
    ["Pra transar", saidAs("sexEnhancer", facts["signal.sexEnhancer"]), "azulzinho / poppers"],
    ["No corpo", saidAs("discomfort", facts["signal.discomfort"]), "pergunta ou menu «Cuidar do corpo»"],
    ["Mistura", `<b>${mixing}</b>`, mixNote],
    ["Avisos mostrados", shown("combination").join(" · ") || "<span class='dim'>nenhum</span>", "aparecem assim que a mistura é conhecida"],
    ["Cuidados dados", shown("care").join(" · ") || "<span class='dim'>nenhum</span>", "alternam com as técnicas, sem fim"],
    ["Próxima pergunta da pista", next ? `<code>${next}</code>` : "<span class='dim'>nenhuma agora</span>", "uma pergunta no máximo entre duas ajudas, nunca antes da 1ª ajuda"],
    ["Ritmo das respostas", `<code>${esc(String(facts["pace"]))}</code>`, "derivado; lento = 90 s ou mais por resposta, 2 vezes"],
  ];
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

  // Pista (audit 012): the follow-up of what was used, in the words the person tapped.
  $("b-pista").innerHTML = pistaRows(s, facts).map(([k, v, note]) => `<tr><th scope="row">${esc(k)}</th><td>${v}</td><td class="dim">${esc(note)}</td></tr>`).join("");

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

/* ───────────────────────── Continuity plane (v0.2) · separate, never controls P0 ───────────────────────── */
const vault = memoryVaultStore();
let consent = false;
let snapshot: ContinuitySnapshot | null = null;
let priors: StrategyPriors = {};
let currentJournal: Journal | null = null;
const DAY = 86_400_000;

async function refreshContinuity() {
  const all = purgeExpired(await vault.readAll(), clock(), REG);
  snapshot = deriveSnapshot(all, clock(), REG);
  priors = consent ? strategyPriors(snapshot, REG) : {};
  renderContinuity();
}

function renderContinuity() {
  const sn = snapshot;
  $("k-snap").innerHTML = sn
    ? [["episódios (180 d)", sn.episodeCount], ["último episódio", sn.lastEpisodeAt ? `${Math.round((clock() - sn.lastEpisodeAt) / DAY)} d atrás` : "—"], ["chegaram a P0", sn.previousP0Count], ["sozinha", sn.supportPatterns.episodesAlone], ["melhorou após apoio", sn.supportPatterns.improvedAfterSupport], ["recusou contato", sn.supportPatterns.declinedContact], ["consentimento", consent ? "ligado" : "desligado (priors vazios)"]]
        .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")
    : "<dt>—</dt><dd>cofre vazio</dd>";
  $("k-strat").innerHTML = sn && sn.strategyHistory.length
    ? sn.strategyHistory.map((h) => `<tr><td><code>${esc(h.strategy)}</code></td><td class="num">${h.attempted}×</td><td class="num">↑${h.outcome.better} =${h.outcome.same} ↓${h.outcome.worse}</td><td>${esc(h.bucket ?? "")}</td><td>${priors[h.strategy] ? `<span class="prior" data-p="${priors[h.strategy]}">${priors[h.strategy]}</span>` : "<span class='dim'>sem evidência</span>"}</td></tr>`).join("")
    : "<tr><td class='dim'>nenhuma estratégia registrada</td></tr>";
  const evs = currentJournal?.events.slice(-12).reverse() ?? [];
  $("k-journal").innerHTML = evs.length
    ? evs.map((e: JournalEvent) => `<tr><td class="num">${e.clientSeq}</td><td><code>${esc(e.kind)}</code></td><td class="dim">${esc(e.provenance)}</td><td class="dim">${esc(Object.entries(e.payload).filter(([, v]) => v !== null && v !== false).map(([k, v]) => `${k}=${String(v)}`).join(" "))}</td></tr>`).join("")
    : "<tr><td class='dim'>—</td></tr>";
}

async function allEventsForSummary(): Promise<JournalEvent[]> {
  const stored = await vault.readAll();
  const cur = currentJournal?.events ?? [];
  const ids = new Set(stored.map((e) => e.eventId));
  return [...stored, ...cur.filter((e) => !ids.has(e.eventId))];
}

let lastSummaryText = "";
async function showSummary(audience: "trusted_person" | "health_professional") {
  if (!currentJournal) return;
  const events = await allEventsForSummary();
  const s = buildCrisisSummary(events, currentJournal.episodeId, { audience, snapshot: consent ? snapshot : null, now: clock() }, REG);
  lastSummaryText = renderSummary(s, locale.continuity);
  const bad = findForbiddenTerms(lastSummaryText, REG);
  $("k-summary-title").textContent = audience === "trusted_person" ? "Resumo para quem está ajudando (escopo: episódio atual)" : `Resumo para profissional de saúde (escopos: ${s.scopes.join(", ")})${bad.length ? " · ✖ termo proibido: " + bad.join(", ") : " · ✔ sem vocabulário diagnóstico"}`;
  $("k-summary").textContent = lastSummaryText;
  $("k-link").textContent = "";
  $("k-summary-wrap").hidden = false;
}

$("k-consent").addEventListener("click", async () => {
  consent = !consent;
  const b = $("k-consent");
  b.setAttribute("aria-pressed", String(consent));
  b.textContent = `Lembrar por 180 dias: ${consent ? "ligado" : "desligado"}`;
  await refreshContinuity();
  toast(consent ? "Continuidade ligada: o histórico pode reordenar estratégias elegíveis. Nunca muda P0, banda nem fatos (L14)." : "Continuidade desligada: o app segue igual ao v0.1.");
});
$("k-seed").addEventListener("click", async () => {
  const now = clock();
  await vault.append([...synthHistory("grounding", "five_senses", 3, "better", now - 2 * DAY, "S"), ...synthHistory("reduce_stimulation", "relocate", 2, "worse", now - 40 * DAY, "R")]);
  if (!consent) $("k-consent").click(); else await refreshContinuity();
  toast("5 episódios simulados: 'cinco sentidos' ajudou 3×. Rode a história self-club-panic-loud e veja o grounding mudar de ordem.");
});
$("k-clear").addEventListener("click", async () => { await vault.wipe(); await refreshContinuity(); toast("Cofre apagado (Apagar cofre = direito de eliminação, LGPD)."); });
$("k-friend").addEventListener("click", () => void showSummary("trusted_person"));
$("k-pro").addEventListener("click", () => void showSummary("health_professional"));
$("k-capsule").addEventListener("click", async () => {
  if (!lastSummaryText) await showSummary("trusted_person");
  const id = newCapsuleId();
  const policy = newCapsule({ id, now: clock(), audience: "trusted_person" }, REG);
  const { sealed, keyB64u } = await sealCapsule(lastSummaryText);
  const link = capsuleLink("https://sos.apollo.rio.br", id, keyB64u);
  const parsed = parseCapsuleLink(link)!;
  const back = await openCapsule(sealed, parsed.key);
  $("k-link").textContent = `${link}\n→ servidor guarda ${sealed.ct.length} chars de cifra, expira em ${Math.round((policy.expiresAt - policy.createdAt) / 3_600_000)} h, máx. ${policy.maxViews} aberturas · chave só no #fragment · ${back === lastSummaryText ? "✔ aberta localmente com a chave" : "✖ falha"}`;
});

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
  // Continuity hooks: strictly after render (INV-019). Priors only with consent (L20).
  loop.hooks = {
    priors: () => (consent ? priors : undefined),
    onJournal: async (evs, j) => {
      currentJournal = j;
      if (consent) await vault.append(evs);
      if (evs.some((e) => e.kind === "EPISODE_ENDED" || e.kind === "STRATEGY_OUTCOME")) await refreshContinuity();
      else renderContinuity();
    },
  };
  await loop.start();
  await refreshContinuity();
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
  currentJournal = null;
  lastSummaryText = "";
  $("k-summary-wrap").hidden = true;
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

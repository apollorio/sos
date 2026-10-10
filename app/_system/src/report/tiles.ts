/**
 * TILES EPISODE — the Relatório / Modo Médico view of a session run on the tiles page (app/index.html, no engine).
 * PURE: the tiles journal + locale → the same MedicoView / RelatorioView the engine episode produces, so one renderer
 * serves both. What the tiles page can honestly say (L01, L15): the app was opened, a tile was opened, an option was
 * tapped, a task was marked done, a phone / WhatsApp / SMS link was tapped, and the flow's own attention level.
 * Everything the engine would ask (breathing, chest, company…) stays «não informado» — never «não».
 * Exposure (the «Bateu forte» flow) only for the professional, like EXPOSURE_CONTEXT (L26).
 */
import type { Reg } from "../core/registry";
import type { Locale } from "../ui/locale";
import { fmtTime, fmtDate } from "../core/handoff/summary";
import { fmtElapsed, type MedicoView, type RelatorioView, type ScanItem, type TimelineRow, type CareItem, type KV, type Tone } from "./model";

export const TILES_KEY = "sos_tiles_journal";
export const TILES_CHANNEL = "sos-apollo-tiles";

export type TilesKind = "start" | "open" | "flow" | "choice" | "task" | "tap" | "risk";
export interface TilesEvent { s: number; at: number; k: TilesKind; f?: string; t?: string; ch?: string; to?: string; lvl?: string }
export interface TilesEpisode { v: 1; id: string; startedAt: number; lastAt: number; events: TilesEvent[] }

const KINDS = new Set<TilesKind>(["start", "open", "flow", "choice", "task", "tap", "risk"]);
const ID = /^[a-z0-9_-]{1,32}$/;
/** Flows whose content reveals use (EXPOSURE_CONTEXT) or screening answers: professional view only. */
const PRO_ONLY_FLOWS = new Set(["torto", "cssrs"]);
const EXPOSURE_FLOW = "torto";
const SCAN = ["responsiveness", "breathing", "chest", "anxiety", "company", "noise"] as const;
const RED_FLAGS = ["seizure", "syncope", "selfHarm", "physicallyUnsafe"] as const;
const LEVELS = ["LOW", "MODERATE", "HIGH", "EMERGENT"];

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : undefined);
const fill = (t: string | undefined, p: Record<string, string | number> = {}) => (t ?? "").replace(/\{(\w+)\}/g, (_, k: string) => String(p[k] ?? ""));
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Strict parse of what app/tiles-journal.js wrote. Anything malformed is dropped; an expired episode is null. */
export function parseTiles(raw: string | null, now: number, retentionHours: number): TilesEpisode | null {
  if (!raw) return null;
  let j: unknown;
  try { j = JSON.parse(raw); } catch { return null; }
  if (!j || typeof j !== "object") return null;
  const o = j as Record<string, unknown>;
  if (o["v"] !== 1 || typeof o["id"] !== "string" || typeof o["startedAt"] !== "number" || typeof o["lastAt"] !== "number" || !Array.isArray(o["events"])) return null;
  if (now - o["lastAt"] > retentionHours * 3_600_000) return null;
  const events: TilesEvent[] = [];
  for (const x of o["events"] as unknown[]) {
    if (!x || typeof x !== "object") continue;
    const e = x as Record<string, unknown>;
    if (typeof e["s"] !== "number" || typeof e["at"] !== "number" || !KINDS.has(e["k"] as TilesKind)) continue;
    const f = str(e["f"], 32), ch = str(e["ch"], 16), to = str(e["to"], 16), lvl = str(e["lvl"], 16);
    events.push({
      s: e["s"], at: e["at"], k: e["k"] as TilesKind,
      ...(f && ID.test(f) ? { f } : {}),
      ...(str(e["t"], 140) ? { t: str(e["t"], 140)! } : {}),
      ...(ch && ID.test(ch) ? { ch } : {}),
      ...(to && ID.test(to) ? { to } : {}),
      ...(lvl && LEVELS.includes(lvl) ? { lvl } : {}),
    });
  }
  events.sort((a, b) => a.s - b.s);
  return { v: 1, id: o["id"].slice(0, 64), startedAt: o["startedAt"], lastAt: o["lastAt"], events };
}

export function buildTilesView(ep: TilesEpisode, now: number, tz: number, reg: Reg, loc: Locale): { medico: MedicoView; relatorio: RelatorioView } {
  const R = loc.continuity.report;
  const forbidden = reg.data.continuity.forbiddenInference.terms.map(norm);
  const t = (at: number) => fmtTime(at, tz);
  const startedAt = ep.events.find((e) => e.k === "start")?.at ?? ep.startedAt;
  const rel = (at: number) => `t+${fmtElapsed(at - startedAt)}`;
  const flowName = (f?: string) => R[`tiles.flow.${f}`] ?? f ?? "";
  /** INV-023: the legacy copy is not lexicon-checked; an option carrying a diagnostic term is cited, never quoted. */
  const safe = (label: string) => !forbidden.some((w) => norm(label).includes(w));
  const tapPhrase = (e: TilesEvent) => R[`tiles.tap.${e.ch}.${e.to}`] ?? R[`tiles.tap.${e.ch}.outro`] ?? `${e.ch}`;
  const levelPhrase = (lvl?: string) => R[`tiles.level.${lvl}`] ?? lvl ?? "";

  const header = {
    startedClock: t(startedAt),
    startedLine: fill(R["startedAt"], { time: t(startedAt), date: fmtDate(startedAt, tz) }),
    updatedLine: fill(R["updatedAt"], { time: t(now) }),
    elapsed: fill(R["elapsed"], { elapsed: fmtElapsed(now - startedAt) }),
    windowLine: `t+00:00 → ${rel(now)}`,
  };

  const phrase = (e: TilesEvent): { title: string; tone: Tone; source: string } | null => {
    switch (e.k) {
      case "start": return { title: R["tiles.ev.start"]!, tone: "reported", source: R["src.runtime_observed"]! };
      case "open": return { title: R["tiles.ev.open"]!, tone: "reported", source: R["src.runtime_observed"]! };
      case "flow": return { title: fill(R["tiles.ev.flow"], { flow: flowName(e.f) }), tone: "reported", source: R["src.user_explicit"]! };
      case "choice": return e.t && safe(e.t)
        ? { title: fill(R["tiles.ev.choice"], { label: e.t, flow: flowName(e.f) }), tone: "reported", source: R["src.user_explicit"]! }
        : { title: fill(R["tiles.ev.choiceCited"], { flow: flowName(e.f) }), tone: "reported", source: R["src.user_explicit"]! };
      case "task": return { title: fill(R["tiles.ev.task"], { label: e.t ?? "" }), tone: "reported", source: R["src.user_explicit"]! };
      case "tap": return { title: fill(R["tiles.ev.tap"], { target: tapPhrase(e) }), tone: e.ch === "tel" && (e.to === "192" || e.to === "193") ? "alert" : "reported", source: R["src.runtime_observed"]! };
      case "risk": return { title: fill(R["tiles.ev.risk"], { level: levelPhrase(e.lvl) }), tone: e.lvl === "EMERGENT" || e.lvl === "HIGH" ? "attention" : "derived", source: R["src.derived"]! };
      default: return null;
    }
  };
  const proOnly = (e: TilesEvent) => e.k === "risk" || (!!e.f && PRO_ONLY_FLOWS.has(e.f));
  const timeline = (pro: boolean): TimelineRow[] => ep.events.flatMap((e) => {
    if (!pro && proOnly(e)) return [];
    const p = phrase(e);
    return p ? [{ rel: rel(e.at), clock: t(e.at), title: p.title, source: p.source, tone: p.tone }] : [];
  });

  /* O que o app apresentou (tiles opened) + o que a pessoa fez (tasks marked done) */
  const care = (pro: boolean): CareItem[] => {
    const out = new Map<string, CareItem>();
    for (const e of ep.events) {
      if (!pro && proOnly(e)) continue;
      if (e.k === "flow" && e.f && !out.has(`flow.${e.f}`)) out.set(`flow.${e.f}`, { title: flowName(e.f), outcome: R["tiles.out.opened"]!, tone: "shown", when: t(e.at) });
      if (e.k === "task" && e.t) out.set(`task.${e.f}.${e.t}`, { title: e.t, outcome: R["out.done"]!, tone: "done", when: t(e.at) });
    }
    return [...out.values()];
  };

  const unknownItem = (signal: string): ScanItem => ({ signal, label: R[`label.${signal}`] ?? signal, value: R["unknownValue"]!, note: R["tiles.unknownNote"]!, tone: "unknown", tag: R["tag.unknown"]! });

  /* Exposição: only what the person tapped in «Bateu forte», in the app's own words */
  const rows = ep.events.filter((e) => e.k === "choice" && e.f === EXPOSURE_FLOW && e.t && safe(e.t))
    .map((e) => ({ label: fill(R["tiles.exposureLabel"], { time: t(e.at) }), reported: e.t!, missing: R["tiles.exposureMissing"]!, provenance: R["src.user_explicit"]! }));

  const flows = [...new Set(ep.events.filter((e) => e.k === "flow" && e.f).map((e) => e.f!))];
  const tasks = ep.events.filter((e) => e.k === "task" && e.t);
  const taps = ep.events.filter((e) => e.k === "tap");
  const lastRisk = [...ep.events].reverse().find((e) => e.k === "risk");
  const list = (xs: string[]) => [...new Set(xs)].join("; ");
  const synthesisFor = (pro: boolean) => [
    R["tiles.synthMode"],
    flows.filter((f) => pro || !PRO_ONLY_FLOWS.has(f)).length ? fill(R["tiles.synthFlows"], { list: list(flows.filter((f) => pro || !PRO_ONLY_FLOWS.has(f)).map(flowName)) }) : R["tiles.synthNoFlow"],
    tasks.filter((e) => pro || !proOnly(e)).length ? fill(R["tiles.synthTasks"], { list: list(tasks.filter((e) => pro || !proOnly(e)).map((e) => e.t!)) }) : null,
    taps.length ? fill(R["tiles.synthTaps"], { list: list(taps.map(tapPhrase)) }) : null,
    pro && lastRisk ? fill(R["tiles.synthLevel"], { level: levelPhrase(lastRisk.lvl) }) : null,
    pro ? fill(R["synthUnknown"], { list: RED_FLAGS.map((s) => (R[`label.${s}`] ?? s).toLowerCase()).join("; ") }) : null,
  ].filter(Boolean).join(" ");

  const textOf = (title: string, rowsT: TimelineRow[], pro: boolean) => [
    title,
    header.startedLine + " · " + header.elapsed,
    "",
    synthesisFor(pro),
    "",
    ...rowsT.map((r) => `${r.clock} · ${r.title}`),
    "",
    R["tiles.copyFooter"]!,
  ].join("\n");

  const medTimeline = timeline(true);
  const medico: MedicoView = {
    header,
    p0: null,
    scan: SCAN.map(unknownItem),
    unknowns: RED_FLAGS.map(unknownItem),
    exposure: { rows, note: rows.length ? null : R["exposureNone"]!, mixes: [] },
    synthesis: synthesisFor(true),
    meta: [
      { k: R["meta.id"]!, v: R["meta.idValue"]! },
      { k: R["meta.history"]!, v: R["meta.historyValue"]! },
      { k: R["meta.location"]!, v: R["meta.locationValue"]! },
      { k: R["meta.confirm"]!, v: R["meta.confirmValue"]! },
    ],
    timeline: medTimeline,
    care: care(true),
    annex: {
      state: [
        { k: R["tiles.annexSource"]!, v: R["tiles.annexSourceValue"]! },
        { k: R["tiles.annexLevel"]!, v: lastRisk ? fill(R["tiles.annexLevelValue"], { level: levelPhrase(lastRisk.lvl) }) : R["unknownValue"]! },
        { k: R["tiles.annexEvents"]!, v: String(ep.events.length) },
      ],
      risk: [],
      signals: reg.data.signals.map((s) => ({ id: s.id, value: "unknown", source: "—", ttl: "—", status: R["st.unknown"]!, tone: "unknown" as Tone })),
    },
    copyText: textOf(R["title"]!, medTimeline, true),
  };

  const relTimeline = timeline(false);
  const lastFlow = [...ep.events].reverse().find((e) => e.k === "flow" && e.f && !PRO_ONLY_FLOWS.has(e.f));
  const lastTap = [...taps].reverse()[0];
  const nowKV: KV[] = [
    ...(lastFlow ? [{ k: R["tiles.nowFlow"]!, v: `${flowName(lastFlow.f)} · ${t(lastFlow.at)}` }] : []),
    ...(lastTap ? [{ k: R["tiles.nowTap"]!, v: `${tapPhrase(lastTap)} · ${t(lastTap.at)}` }] : []),
  ];
  const relatorio: RelatorioView = {
    header,
    p0: null,
    now: nowKV,
    tried: care(false).filter((c) => c.tone === "done"),
    timeline: relTimeline,
    shareText: textOf(R["relTitle"]!, relTimeline, false),
  };
  return { medico, relatorio };
}

/**
 * REPORT MODEL — Relatório de Emergência (person / trusted view) and Modo Médico (health professional handoff).
 * PURE: journal events + state snapshot + registry + locale → a view with plain strings. No DOM, no clock.
 * Built on the engine's own Crisis Passport rules (src/core/handoff/summary.ts, ADR-0008):
 *   - reported ≠ derived ≠ unknown (L15, INV-022): every line says where it came from;
 *   - "não informado" never becomes "não" (a missing datum is never an absence of risk);
 *   - exposure (substance, alcohol, sex enhancers) only for the professional audience (EXPOSURE_CONTEXT, L26);
 *   - every string comes from locale templates (INV-023 lexicon-checked), never generated.
 */
import type { JournalEvent } from "../core/journal/journal";
import type { SessionState } from "../core/domain/state";
import type { Reg } from "../core/registry";
import type { Locale } from "../ui/locale";
import { buildCrisisSummary, renderSummary, fmtTime, fmtDate, revealsExposure } from "../core/handoff/summary";
import { buildFacts } from "../core/logic/facts";

export interface Episode {
  episodeId: string;
  events: JournalEvent[];
  state: SessionState | null;
  /** Epoch ms of "now" for this view (live: the device clock; lab: the scenario's last step). */
  now: number;
  /** Minutes east of UTC (Brazil: -180). */
  tz: number;
  source: "live" | "lab";
}

export type Tone = "reported" | "alert" | "attention" | "unknown" | "derived";
export interface ScanItem { signal: string; label: string; value: string; note: string; tone: Tone; tag: string }
export interface ExposureRow { label: string; reported: string; missing: string; provenance: string }
export interface MixAlert { title: string; when: string }
export interface CareItem { title: string; outcome: string; tone: "done" | "shown" | "failed"; when: string }
export interface TimelineRow { rel: string; clock: string; title: string; source: string; tone: Tone }
export interface SignalRow { id: string; value: string; source: string; ttl: string; status: string; tone: Tone }
export interface KV { k: string; v: string }

export interface Header { startedClock: string; startedLine: string; updatedLine: string; elapsed: string; windowLine: string }

export interface MedicoView {
  header: Header;
  p0: string | null;
  scan: ScanItem[];
  unknowns: ScanItem[];
  exposure: { rows: ExposureRow[]; note: string | null; mixes: MixAlert[] };
  synthesis: string;
  meta: KV[];
  timeline: TimelineRow[];
  care: CareItem[];
  annex: { state: KV[]; risk: KV[]; signals: SignalRow[] };
  copyText: string;
}

export interface RelatorioView {
  header: Header;
  p0: string | null;
  now: KV[];
  tried: CareItem[];
  timeline: TimelineRow[];
  shareText: string;
}

const EXPOSURE = ["substanceClass", "substance", "alcohol", "sexEnhancer"] as const;
const EXPOSURE_SET = new Set<string>(EXPOSURE);
const SCAN = ["responsiveness", "breathing", "chest", "anxiety", "company", "noise"] as const;
const RED_FLAGS = ["seizure", "syncope", "selfHarm", "physicallyUnsafe"] as const;
const INTERVENTIONS = new Set(["reduce_stimulation", "contact_trusted_person", "grounding", "care", "combination", "steady_check"]);

const fill = (t: string | undefined, p: Record<string, string | number> = {}) => (t ?? "").replace(/\{(\w+)\}/g, (_, k: string) => String(p[k] ?? ""));
const p2 = (n: number) => String(Math.floor(n)).padStart(2, "0");
/** "12:04" for under an hour, "1h 12:04" after. */
export function fmtElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  return `${h ? `${h}h ` : ""}${p2((s % 3600) / 60)}:${p2(s % 60)}`;
}
/** Menu counter: [00h04m12s]. */
export function fmtCounter(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `[${p2(s / 3600)}h${p2((s % 3600) / 60)}m${p2(s % 60)}s]`;
}

/** Severity of a reported value: only for colour + the text tag (colour is never the only carrier, WCAG 1.4.1). */
function toneOf(signal: string, value: unknown): Tone {
  const v = String(value);
  if (v === "unknown") return "unknown";
  if (["responsiveness:impaired", "responsiveness:unresponsive", "breathing:abnormal", "breathing:severely_abnormal", "chest:yes", "seizure:yes", "syncope:yes", "selfHarm:yes", "physicallyUnsafe:yes"].includes(`${signal}:${v}`)) return "alert";
  if ((signal === "anxiety" && Number(value) >= 3) || `${signal}:${v}` === "company:alone" || `${signal}:${v}` === "noise:loud" || `${signal}:${v}` === "reportedTrend:worse") return "attention";
  return "reported";
}

interface Latest { value: string; at: number; provenance: string; expiredAt: number | null }

/** Latest explicit value per signal, and whether it expired afterwards (TTL or on purpose). */
function latestSignals(events: JournalEvent[]): Map<string, Latest> {
  const m = new Map<string, Latest>();
  for (const e of events) {
    if (e.kind === "SIGNAL_REPORTED") {
      const v = e.payload["value"];
      if (v === null || v === undefined || v === "unknown") continue;
      m.set(String(e.payload["signal"]), { value: String(v), at: e.clientObservedAt, provenance: e.provenance, expiredAt: null });
    } else if (e.kind === "SIGNAL_EXPIRED") {
      const cur = m.get(String(e.payload["signal"]));
      if (cur && cur.expiredAt === null) cur.expiredAt = e.clientObservedAt;
    }
  }
  return m;
}

export function buildView(ep: Episode, reg: Reg, loc: Locale) {
  const R = loc.continuity.report;
  const C = loc.continuity;
  const events = ep.events.filter((e) => e.episodeId === ep.episodeId).slice().sort((a, b) => a.clientSeq - b.clientSeq);
  const t = (at: number) => fmtTime(at, ep.tz);
  const startedAt = events.find((e) => e.kind === "EPISODE_STARTED")?.clientObservedAt ?? ep.state?.startedAt ?? events[0]?.clientObservedAt ?? ep.now;
  const rel = (at: number) => `t+${fmtElapsed(at - startedAt)}`;
  const latest = latestSignals(events);
  const phrase = (signal: string, value: string) => C.signalPhrases[`${signal}.${value}`] ?? (value === "no" ? R["valueNo"]! : value);
  const noteFor = (l: Latest) => l.expiredAt !== null ? fill(R["noteExpired"], { time: t(l.at) })
    : fill(R[l.provenance === "helper_explicit" ? "noteHelper" : l.provenance === "derived" ? "noteDerived" : "noteReported"], { time: t(l.at) });
  const tagFor = (tone: Tone) => R[`tag.${tone === "reported" ? "reported" : tone}`] ?? "";

  const header: Header = {
    startedClock: t(startedAt),
    startedLine: fill(R["startedAt"], { time: t(startedAt), date: fmtDate(startedAt, ep.tz) }),
    updatedLine: fill(R["updatedAt"], { time: t(ep.now) }),
    elapsed: fill(R["elapsed"], { elapsed: fmtElapsed(ep.now - startedAt) }),
    windowLine: `t+00:00 → ${rel(ep.now)}`,
  };

  /* ── P0: the only thing that must be read first ── */
  const reasonOf = (p: JournalEvent["payload"]) => C.reasonPhrases[String(p["reason"] ?? "")] ?? String(p["reason"] ?? "");
  const lastP0 = [...events].reverse().find((e) => e.kind === "BAND_CHANGED" && e.payload["to"] === "P0");
  const p0Active = ep.state?.shownBand === "P0" || (ep.state === null && !!lastP0 && ![...events].reverse().find((e) => e.kind === "BAND_CHANGED" && e.clientSeq > lastP0.clientSeq));
  const p0 = lastP0 ? `${p0Active ? `${R["p0Now"]} ` : ""}${fill(R["p0Line"], { time: t(lastP0.clientObservedAt), reason: reasonOf(lastP0.payload) })}` : null;

  /* ── Leitura rápida ── */
  const scanItem = (signal: string): ScanItem => {
    const l = latest.get(signal);
    if (!l) return { signal, label: R[`label.${signal}`] ?? signal, value: R["unknownValue"]!, note: R["unknownNote"]!, tone: "unknown", tag: tagFor("unknown") };
    const tone = l.expiredAt !== null ? "attention" : toneOf(signal, l.value);
    const note = signal === "anxiety" ? `${noteFor(l)} · ${fill(R["anxietyNote"], { value: l.value })}` : noteFor(l);
    return { signal, label: R[`label.${signal}`] ?? signal, value: phrase(signal, l.value), note, tone, tag: tagFor(tone) };
  };
  const scan = SCAN.map(scanItem);
  const unknowns = RED_FLAGS.map(scanItem);

  /* ── Exposição (professional only) ── */
  const rows: ExposureRow[] = [];
  for (const s of [...EXPOSURE, "discomfort"]) {
    const l = latest.get(s);
    if (!l) continue;
    if (s === "substanceClass" && l.value === "none") continue;
    rows.push({ label: R[`label.${s}`] ?? s, reported: phrase(s, l.value), missing: R[`missing.${s}`] ?? "", provenance: R[`src.${l.provenance}`] ?? l.provenance });
  }
  const denied = latest.get("substanceClass")?.value === "none";
  const exposureNote = denied ? R["exposureDenied"]! : rows.length ? null : R["exposureNone"]!;

  /* ── O que o app apresentou (cards) + resultado ── */
  const care = new Map<string, CareItem>();
  const mixes: MixAlert[] = [];
  for (const e of events) {
    const p = e.payload;
    if (e.kind === "CARD_SHOWN" && p["kind"] === "action" && INTERVENTIONS.has(String(p["skill"])) && typeof p["strategy"] === "string") {
      const key = `${p["skill"]}.${p["strategy"]}`;
      if (!care.has(key)) care.set(key, { title: C.strategyPhrases[key] ?? key, outcome: R["out.offered"]!, tone: "shown", when: t(e.clientObservedAt) });
      if (p["skill"] === "combination" && !mixes.some((m) => m.title === (C.strategyPhrases[key] ?? key))) mixes.push({ title: C.strategyPhrases[key] ?? key, when: fill(R["mixShown"], { time: t(e.clientObservedAt) }) });
    } else if (e.kind === "STRATEGY_OUTCOME") {
      const key = `${p["skill"]}.${p["strategy"]}`;
      const o = String(p["outcome"]);
      const combo = p["skill"] === "combination";
      const outcome = o === "done" ? R[combo ? "out.ack" : "out.done"]! : R[`out.${o}`] ?? o;
      care.set(key, { title: C.strategyPhrases[key] ?? key, outcome, tone: o === "done" ? "done" : "failed", when: t(e.clientObservedAt) });
      const mix = mixes.find((m) => m.title === (C.strategyPhrases[key] ?? key));
      if (combo && mix && o === "done") mix.when = fill(R["mixDone"], { time: t(e.clientObservedAt) });
    }
  }

  /* ── Linha do tempo condensada ── */
  const timeline = (audience: "health_professional" | "trusted_person"): TimelineRow[] => {
    const out: TimelineRow[] = [];
    const row = (e: JournalEvent, title: string, tone: Tone) => out.push({ rel: rel(e.clientObservedAt), clock: t(e.clientObservedAt), title, source: R[`src.${e.provenance}`] ?? e.provenance, tone });
    for (const e of events) {
      const p = e.payload;
      switch (e.kind) {
        case "EPISODE_STARTED": case "EPISODE_ENDED": case "EMERGENCY_CALL_REPORTED": case "HELP_ON_SCENE": case "CORRECTION":
          row(e, C.eventPhrases[e.kind] ?? e.kind, e.kind === "EMERGENCY_CALL_REPORTED" ? "alert" : "reported");
          break;
        case "SIGNAL_REPORTED": {
          const s = String(p["signal"]), v = String(p["value"]);
          if (v === "unknown" || (audience === "trusted_person" && (EXPOSURE_SET.has(s) || e.provenance === "derived"))) break;
          row(e, phrase(s, v), e.provenance === "derived" ? "derived" : toneOf(s, v));
          break;
        }
        case "BAND_CHANGED":
          if (p["to"] === "P0") row(e, `${C.bandPhrases["P0"]} · ${reasonOf(p)}`, "alert");
          else if (p["from"] === "P0") row(e, C.bandPhrases[String(p["to"])] ?? String(p["to"]), "derived");
          break;
        case "CARD_SHOWN":
          if (p["skill"] === "combination" && typeof p["strategy"] === "string" && audience === "health_professional") row(e, `${C.strategyPhrases[`combination.${p["strategy"]}`] ?? p["strategy"]} · ${R["out.offered"]!.toLowerCase()}`, "attention");
          break;
        case "STRATEGY_OUTCOME": {
          const key = `${p["skill"]}.${p["strategy"]}`;
          if (audience === "trusted_person" && revealsExposure(String(p["skill"]), String(p["strategy"]))) break;
          row(e, `${C.strategyPhrases[key] ?? key} (${C.outcomePhrases[String(p["outcome"])] ?? p["outcome"]})`, "reported");
          break;
        }
        case "HANDOFF_OPENED":
          row(e, C.handoffPhrases[`${p["channel"]}.${p["target"]}`] ?? `${p["channel"]}.${p["target"]}`, p["target"] === "emergency" ? "alert" : "reported");
          break;
        case "APP_HIDDEN": case "APP_VISIBLE":
          if (audience === "health_professional") row(e, C.eventPhrases[e.kind] ?? e.kind, "derived");
          break;
        default: break;
      }
    }
    const card = ep.state?.status === "active" ? ep.state.card : null;
    if (card) {
      const lc = loc.cards[card.cardId];
      const title = lc ? (typeof lc.title === "string" ? lc.title : lc.title["default"] ?? Object.values(lc.title)[0] ?? card.cardId) : card.cardId;
      out.push({ rel: rel(ep.now), clock: t(ep.now), title: fill(R["timelineNow"], { card: `«${title.replace(/\*\*/g, "")}»` }), source: R["src.derived"]!, tone: "derived" });
    }
    return out;
  };

  /* ── Síntese (deterministic sentence from the same phrases) ── */
  const actor = latest.get("actor")?.value ?? "unknown";
  const reportedList = [...SCAN, "companion", "discomfort", "reportedTrend"].map((s) => latest.get(s)).map((l, i) => (l && l.expiredAt === null ? phrase([...SCAN, "companion", "discomfort", "reportedTrend"][i]!, l.value) : null)).filter((x): x is string => !!x);
  const redFlagsReported = RED_FLAGS.filter((s) => latest.get(s)).map((s) => phrase(s, latest.get(s)!.value));
  const exposureList = EXPOSURE.map((s) => latest.get(s)).map((l, i) => (l ? phrase(EXPOSURE[i]!, l.value) : null)).filter((x): x is string => !!x);
  const unknownList = RED_FLAGS.filter((s) => !latest.get(s)).map((s) => (R[`label.${s}`] ?? s).toLowerCase());
  const careList = [...care.values()].map((c) => `${c.title} (${c.outcome.toLowerCase()})`);
  const synthesis = [
    R[`synthActor.${actor === "helper" ? "helper" : actor === "self" ? "self" : "unknown"}`],
    lastP0 ? fill(R["synthP0"], { reason: reasonOf(lastP0.payload) }) : null,
    [...redFlagsReported, ...reportedList].length ? fill(R["synthReported"], { list: [...redFlagsReported, ...reportedList].join("; ") }) : null,
    exposureList.length ? fill(R["synthExposure"], { list: exposureList.join("; ") }) : denied ? R["exposureDenied"] : null,
    careList.length ? fill(R["synthCare"], { list: careList.join("; ") }) : null,
    unknownList.length ? fill(R["synthUnknown"], { list: unknownList.join("; ") }) : null,
  ].filter(Boolean).join(" ");

  /* ── Anexo técnico ── */
  const st = ep.state;
  const facts = st ? buildFacts(st, ep.now, reg) : null;
  const lastCard = [...events].reverse().find((e) => e.kind === "CARD_SHOWN");
  const bandNow = st?.shownBand ?? null;
  const pace = facts ? String(facts.facts["pace"] ?? "unknown") : "unknown";
  const annexState: KV[] = [
    { k: R["bandLabel"]!, v: bandNow ? `${bandNow} · ${C.bandPhrases[bandNow] ?? ""}` : R["unknownValue"]! },
    { k: R["ruleLabel"]!, v: lastCard ? `${String(lastCard.payload["policyRule"] ?? "—")} → ${String(lastCard.payload["skill"])}${lastCard.payload["strategy"] ? `.${String(lastCard.payload["strategy"])}` : ""}${lastCard.payload["questionId"] ? ` (${String(lastCard.payload["questionId"])})` : ""}` : "—" },
    { k: R["paceLabel"]!, v: fill(R["paceValue"], { pace: R[`pace.${pace}`] ?? pace }) },
    { k: R["p0Label"]!, v: st?.p0 ? fill(R["p0Yes"], { rule: st.p0.ruleId, reason: C.reasonPhrases[st.p0.reason] ?? st.p0.reason }) : R["p0No"]! },
  ];
  const risk: KV[] = facts ? Object.entries(facts.risk).map(([k, v]) => ({ k, v: String(v) })) : [];
  const signals: SignalRow[] = reg.data.signals.map((s) => {
    const rec = st ? (st.signals as Record<string, { value: unknown; source: string; expiresAt: number | null } | undefined>)[s.id] : undefined;
    if (!rec) return { id: s.id, value: "unknown", source: "—", ttl: "—", status: R["st.unknown"]!, tone: "unknown" as Tone };
    const expired = rec.expiresAt !== null && rec.expiresAt <= ep.now;
    return {
      id: s.id,
      value: String(rec.value),
      source: R[`source.${rec.source}`] ?? rec.source,
      ttl: rec.expiresAt === null ? "∞" : expired ? "0:00" : fmtElapsed(rec.expiresAt - ep.now),
      status: expired ? R["st.expired"]! : R["st.known"]!,
      tone: expired ? "attention" as Tone : "reported" as Tone,
    };
  });

  const summaryFor = (audience: "health_professional" | "trusted_person") =>
    renderSummary(buildCrisisSummary(events, ep.episodeId, { audience, now: ep.now }, reg), C, ep.tz);

  const medico: MedicoView = {
    header,
    p0,
    scan,
    unknowns,
    exposure: { rows, note: exposureNote, mixes },
    synthesis,
    meta: [
      { k: R["meta.id"]!, v: R["meta.idValue"]! },
      { k: R["meta.history"]!, v: R["meta.historyValue"]! },
      { k: R["meta.location"]!, v: R["meta.locationValue"]! },
      { k: R["meta.confirm"]!, v: R["meta.confirmValue"]! },
    ],
    timeline: timeline("health_professional"),
    care: [...care.values()],
    annex: { state: annexState, risk, signals },
    copyText: summaryFor("health_professional"),
  };

  const nowKV: KV[] = [...SCAN, ...RED_FLAGS, "companion", "discomfort"].flatMap((s) => {
    const l = latest.get(s);
    return l && l.expiredAt === null ? [{ k: R[`label.${s}`] ?? s, v: phrase(s, l.value) }] : [];
  });
  const relatorio: RelatorioView = {
    header,
    p0,
    now: nowKV,
    tried: [...care.entries()].filter(([k]) => { const [sk, st] = k.split("."); return !revealsExposure(sk!, st ?? ""); }).map(([, v]) => v),
    timeline: timeline("trusted_person"),
    shareText: summaryFor("trusted_person"),
  };
  return { medico, relatorio };
}

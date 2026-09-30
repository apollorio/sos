/**
 * CRISIS PASSPORT — deterministic episode summaries (Blueprint v0.2 §9, ADR-0008). PURE.
 * Facts (`reported`) and interpretations (`derived`) never mix (L15, INV-022). No LLM. No diagnosis (L16, INV-023).
 * Rendering uses locale templates only; every line is traceable to a journal event by `at`.
 */
import type { AccessScope, Provenance, ShareAudience } from "../../generated/registry.gen";
import type { Reg } from "../registry";
import type { JournalEvent } from "../journal/journal";
import type { ContinuitySnapshot } from "../continuity/types";

export interface SummaryLine {
  at: number;
  provenance: Provenance;
  /** Locale phrase key (e.g. "signal:company.alone", "strategy:grounding.breath_pacer", "event:HELP_ON_SCENE"). */
  key: string;
  params: Record<string, string | number>;
}

export interface CrisisSummary {
  v: 1;
  audience: ShareAudience;
  scopes: AccessScope[];
  episodeId: string;
  startedAt: number | null;
  endedAt: number | null;
  generatedAt: number;
  reported: SummaryLine[];
  derived: SummaryLine[];
  course: SummaryLine[];
  previous: { days: number; episodeCount: number; p0Count: number; helpful: string[] } | null;
  location: string | null;
}

export interface SummaryLocale {
  signalPhrases: Record<string, string>;
  strategyPhrases: Record<string, string>;
  outcomePhrases: Record<string, string>;
  bandPhrases: Record<string, string>;
  reasonPhrases: Record<string, string>;
  handoffPhrases: Record<string, string>;
  eventPhrases: Record<string, string>;
  trusted: Record<string, string>;
  professional: Record<string, string>;
}

const EXPOSURE_SIGNALS = new Set(["substanceClass", "substance", "alcohol", "sexEnhancer"]); // only with the EXPOSURE_CONTEXT scope (L26)
/**
 * Strategies whose very name tells what was used (combination warnings, substance-specific care).
 * Same scope rule as the exposure signals: without EXPOSURE_CONTEXT they are left out, or a friend's summary
 * would read «aviso: bala com álcool» even though the substance itself was withheld (L26).
 */
export function revealsExposure(skill: string, strategy: string): boolean {
  return skill === "combination" || (skill === "care" && ["pill_care", "poppers_care", "inhalant_air"].includes(strategy));
}
const COURSE_EVENTS = new Set(["EMERGENCY_CALL_REPORTED", "HELP_ON_SCENE", "CORRECTION", "APP_HIDDEN", "APP_VISIBLE", "EPISODE_STARTED", "EPISODE_ENDED"]);
const INTERVENTION_SKILLS = new Set(["reduce_stimulation", "contact_trusted_person", "grounding", "care", "combination", "steady_check"]);

export function allowedScopes(audience: ShareAudience, reg: Reg): AccessScope[] {
  return [...(reg.data.continuity.share.audiences[audience] ?? []), ...reg.data.continuity.share.optionalScopes] as AccessScope[];
}

export function defaultScopes(audience: ShareAudience, reg: Reg): AccessScope[] {
  return (reg.data.continuity.share.audiences[audience] ?? []) as AccessScope[];
}

export interface BuildOptions {
  audience: ShareAudience;
  scopes?: AccessScope[];
  snapshot?: ContinuitySnapshot | null;
  /** Only used when scopes include LOCATION_CURRENT (D16). Never read from the journal. */
  location?: string | null;
  now: number;
}

export function buildCrisisSummary(events: JournalEvent[], episodeId: string, opts: BuildOptions, reg: Reg): CrisisSummary {
  const scopes = (opts.scopes ?? defaultScopes(opts.audience, reg)).filter((s) => allowedScopes(opts.audience, reg).includes(s));
  const has = (s: AccessScope) => scopes.includes(s);
  const ep = events.filter((e) => e.episodeId === episodeId).slice().sort((a, b) => a.clientSeq - b.clientSeq);
  const reported: SummaryLine[] = [];
  const derived: SummaryLine[] = [];
  const course: SummaryLine[] = [];
  let startedAt: number | null = null;
  let endedAt: number | null = null;

  if (has("CURRENT_EPISODE")) {
    for (const e of ep) {
      const p = e.payload;
      switch (e.kind) {
        case "EPISODE_STARTED":
          startedAt = e.clientObservedAt;
          course.push({ at: e.clientObservedAt, provenance: e.provenance, key: "event:EPISODE_STARTED", params: {} });
          break;
        case "EPISODE_ENDED":
          endedAt = e.clientObservedAt;
          course.push({ at: e.clientObservedAt, provenance: e.provenance, key: "event:EPISODE_ENDED", params: {} });
          break;
        case "SIGNAL_REPORTED": {
          const signal = String(p["signal"]);
          const value = p["value"];
          if (value === "unknown" || value === null) break;
          if (EXPOSURE_SIGNALS.has(signal) && !has("EXPOSURE_CONTEXT")) break;
          if (e.provenance === "derived") derived.push({ at: e.clientObservedAt, provenance: e.provenance, key: `signal:${signal}.${String(value)}`, params: {} });
          else reported.push({ at: e.clientObservedAt, provenance: e.provenance, key: `signal:${signal}.${String(value)}`, params: {} });
          break;
        }
        case "BAND_CHANGED":
          derived.push({ at: e.clientObservedAt, provenance: "derived", key: `band:${String(p["to"])}`, params: p["reason"] ? { reason: String(p["reason"]) } : {} });
          break;
        case "CARD_SHOWN": {
          const skill = String(p["skill"]);
          if (p["kind"] !== "action" || !INTERVENTION_SKILLS.has(skill) || typeof p["strategy"] !== "string") break;
          if (revealsExposure(skill, p["strategy"]) && !has("EXPOSURE_CONTEXT")) break;
          course.push({ at: e.clientObservedAt, provenance: "derived", key: `strategy:${skill}.${p["strategy"]}`, params: { outcome: "offered" } });
          break;
        }
        case "STRATEGY_OUTCOME":
          if (revealsExposure(String(p["skill"]), String(p["strategy"])) && !has("EXPOSURE_CONTEXT")) break;
          course.push({ at: e.clientObservedAt, provenance: e.provenance, key: `strategy:${String(p["skill"])}.${String(p["strategy"])}`, params: { outcome: String(p["outcome"]) } });
          break;
        case "HANDOFF_OPENED":
          course.push({ at: e.clientObservedAt, provenance: e.provenance, key: `handoff:${String(p["channel"])}.${String(p["target"])}`, params: {} });
          break;
        default:
          if (COURSE_EVENTS.has(e.kind)) course.push({ at: e.clientObservedAt, provenance: e.provenance, key: `event:${e.kind}`, params: {} });
      }
    }
  }

  let previous: CrisisSummary["previous"] = null;
  if (opts.snapshot && (has("RECENT_CRISIS_HISTORY") || has("STRATEGY_HISTORY"))) {
    const ev = reg.data.continuity.evidence;
    previous = {
      days: opts.snapshot.windowDays,
      episodeCount: has("RECENT_CRISIS_HISTORY") ? opts.snapshot.episodeCount : 0,
      p0Count: has("RECENT_CRISIS_HISTORY") ? opts.snapshot.previousP0Count : 0,
      helpful: has("STRATEGY_HISTORY")
        ? opts.snapshot.strategyHistory.filter((h) => h.attempted >= ev.minAttempted && h.outcome.better >= ev.minBetterForHelpful).map((h) => h.strategy)
        : [],
    };
  }

  return {
    v: 1,
    audience: opts.audience,
    scopes,
    episodeId,
    startedAt,
    endedAt,
    generatedAt: opts.now,
    reported,
    derived,
    course,
    previous,
    location: has("LOCATION_CURRENT") && opts.location ? opts.location : null,
  };
}

/* ─────────────────────────────── rendering (templates only) ─────────────────────────────── */

const fill = (t: string, params: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? ""));

export function phraseFor(line: SummaryLine, loc: SummaryLocale): string {
  const [kind, rest] = line.key.split(":", 2) as [string, string];
  switch (kind) {
    case "signal": return loc.signalPhrases[rest] ?? rest;
    case "strategy": {
      const s = loc.strategyPhrases[rest] ?? rest;
      const o = String(line.params["outcome"] ?? "");
      return o && o !== "offered" ? `${s} (${loc.outcomePhrases[o] ?? o})` : s;
    }
    case "band": {
      const b = loc.bandPhrases[rest] ?? rest;
      const r = line.params["reason"];
      return r ? `${b} · ${loc.reasonPhrases[String(r)] ?? String(r)}` : b;
    }
    case "handoff": return loc.handoffPhrases[rest] ?? rest;
    case "event": return loc.eventPhrases[rest] ?? rest;
    default: return line.key;
  }
}

/** Deterministic clock formatting from epoch ms (no Date object: the core never reads the clock). tzOffsetMin = minutes east of UTC. */
function civil(at: number, tzOffsetMin: number): { y: number; m: number; d: number; hh: number; mm: number } {
  const local = at + tzOffsetMin * 60_000;
  const days = Math.floor(local / 86_400_000);
  const rem = local - days * 86_400_000;
  const hh = Math.floor(rem / 3_600_000);
  const mm = Math.floor((rem % 3_600_000) / 60_000);
  // Howard Hinnant's civil_from_days.
  const z = days + 719_468;
  const era = Math.floor(z / 146_097);
  const doe = z - era * 146_097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36_524) - Math.floor(doe / 146_096)) / 365);
  const y0 = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  return { y: m <= 2 ? y0 + 1 : y0, m, d, hh, mm };
}
const p2 = (n: number) => String(n).padStart(2, "0");
export function fmtTime(at: number, tzOffsetMin: number): string { const c = civil(at, tzOffsetMin); return `${p2(c.hh)}:${p2(c.mm)}`; }
export function fmtDate(at: number, tzOffsetMin: number): string { const c = civil(at, tzOffsetMin); return `${p2(c.d)}/${p2(c.m)}/${c.y}`; }

export function renderSummary(s: CrisisSummary, loc: SummaryLocale, tzOffsetMin = -180): string {
  const t = (at: number) => fmtTime(at, tzOffsetMin);
  const out: string[] = [];
  if (s.audience === "trusted_person") {
    const L = loc.trusted;
    out.push(L["title"]!, "");
    if (s.startedAt !== null) out.push(fill(L["started"]!, { time: t(s.startedAt) }), "");
    const latest = latestBySignal(s.reported);
    out.push(L["nowHeading"]!);
    if (latest.length) for (const l of latest) out.push(`• ${phraseFor(l, loc)}`);
    else out.push(`• ${L["empty"]}`);
    const tried = s.course.filter((l) => l.key.startsWith("strategy:"));
    if (tried.length) { out.push("", L["triedHeading"]!); for (const l of tried) out.push(fill(L["triedLine"]!, { time: t(l.at), strategy: phraseFor({ ...l, params: {} }, loc), outcome: outcomeWord(l, loc) })); }
    out.push("", L["closing"]!);
  } else {
    const L = loc.professional;
    out.push(L["title"]!, "");
    if (s.startedAt !== null) out.push(fill(L["started"]!, { time: t(s.startedAt), date: fmtDate(s.startedAt, tzOffsetMin) }), "");
    out.push(L["reportedHeading"]!);
    for (const l of s.reported) out.push(fill(L["line"]!, { time: t(l.at), text: phraseFor(l, loc) }));
    out.push("", L["derivedHeading"]!);
    for (const l of s.derived) out.push(fill(L["line"]!, { time: t(l.at), text: phraseFor(l, loc) }));
    out.push("", L["courseHeading"]!);
    for (const l of s.course) out.push(fill(L["line"]!, { time: t(l.at), text: phraseFor(l, loc) }));
    if (s.previous) {
      out.push("", fill(L["historyHeading"]!, { days: s.previous.days }));
      if (s.previous.episodeCount === 0 && !s.previous.helpful.length) out.push(L["historyNone"]!);
      else {
        out.push(fill(L["historyEpisodes"]!, { n: s.previous.episodeCount }), fill(L["historyP0"]!, { n: s.previous.p0Count }));
        for (const h of s.previous.helpful) out.push(fill(L["historyHelpful"]!, { strategy: loc.strategyPhrases[h] ?? h }));
      }
    }
    if (s.location) out.push("", fill(L["locationLine"]!, { location: s.location }));
    out.push("", L["disclaimer"]!);
  }
  return out.join("\n");
}

function outcomeWord(l: SummaryLine, loc: SummaryLocale): string {
  const o = String(l.params["outcome"] ?? "offered");
  return o === "offered" ? (loc.outcomePhrases["offered"] ?? "sugerido") : (loc.outcomePhrases[o] ?? o);
}

/** For the friend view: the latest explicit value of each signal, in first-seen order. */
function latestBySignal(lines: SummaryLine[]): SummaryLine[] {
  const m = new Map<string, SummaryLine>();
  for (const l of lines) m.set(l.key.split(".")[0]!, l);
  return [...m.values()];
}

/** INV-023: accent-insensitive containment test against registry.continuity.forbiddenInference. */
export function findForbiddenTerms(text: string, reg: Reg): string[] {
  const norm = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const t = norm(text);
  return reg.data.continuity.forbiddenInference.terms.filter((term) => t.includes(norm(term)));
}

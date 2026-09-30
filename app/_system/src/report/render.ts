/**
 * REPORT RENDER — dumb DOM builders for the Modo Médico document and the Relatório page.
 * Text nodes only (never innerHTML): every string comes from the model, which comes from locale templates.
 * Colour is never the only carrier: every tinted block also prints its text tag (WCAG 1.4.1, black-and-white print).
 */
import type { MedicoView, RelatorioView, ScanItem, TimelineRow, CareItem, KV } from "./model";

type Kids = (Node | string | null | false | undefined)[];
export function h(tag: string, cls?: string | null, ...kids: Kids): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  for (const k of kids) if (k !== null && k !== false && k !== undefined) e.append(typeof k === "string" ? document.createTextNode(k) : k);
  return e;
}

const sectionTitle = (title: string, hint: string) => h("div", "section-title", h("h2", null, title), h("span", null, hint));
const scanCard = (s: ScanItem) => h("article", `scan tone-${s.tone}`, h("div", "label", s.label), h("div", "value", s.value), h("div", "note", h("b", "tag-print", `${s.tag} · `), s.note));
const kvGrid = (items: KV[], cls = "meta-grid") => h("div", cls, ...items.map((m) => h("div", "meta", h("div", "k", m.k), h("div", "v", m.v))));
const timelineList = (rows: TimelineRow[]) => h("ol", "timeline", ...rows.map((r) => h("li", `tone-${r.tone}`, h("div", "time", r.rel, h("small", null, r.clock)), h("div", "tl-main", h("strong", null, r.title)), h("div", "tl-state", r.source))));
const careGrid = (items: CareItem[], empty: string) => items.length
  ? h("div", "care-grid", ...items.map((c) => h("div", "care", h("div", "care-head", h("strong", null, c.title), h("span", `out out-${c.tone}`, c.outcome)), h("p", null, c.when))))
  : h("p", "empty", empty);

function docHead(brand: string, title: string, subtitle: string, boxK: string, boxV: string, boxSub: string): HTMLElement {
  return h("header", "doc-head",
    h("div", null, h("div", "brandline", brand), h("h1", null, title), h("p", "subtitle", subtitle)),
    h("div", "episode-box", h("div", "k", boxK), h("div", "v", boxV), h("div", "sub", boxSub)));
}
const footer = (left: string, n: number, total: number, R: Record<string, string>) =>
  h("footer", "page-footer", h("span", null, left), h("span", null, (R["page"] ?? "").replace("{n}", String(n)).replace("{total}", String(total))));

export function renderMedico(host: HTMLElement, v: MedicoView, R: Record<string, string>, sourceLabel: string): void {
  const p0 = v.p0 ? h("div", "p0-banner", h("b", null, R["p0Badge"] ?? ""), h("p", null, v.p0)) : null;

  const exposure = h("section", "section",
    sectionTitle(R["exposureTitle"]!, R["exposureHint"]!),
    v.exposure.rows.length
      ? h("table", "exposure",
          h("thead", null, h("tr", null, h("th", null, R["col.item"]!), h("th", null, R["col.reported"]!), h("th", null, R["col.missing"]!), h("th", null, R["col.provenance"]!))),
          h("tbody", null, ...v.exposure.rows.map((r) => h("tr", null, h("td", null, h("strong", null, r.label)), h("td", null, r.reported), h("td", null, r.missing), h("td", null, h("span", "tag reported", r.provenance))))))
      : null,
    v.exposure.note ? h("p", "empty", v.exposure.note) : null,
    v.exposure.mixes.length ? h("div", "mix-alerts", ...v.exposure.mixes.map((m) => h("div", "mix", h("small", null, R["mixTitle"]!), h("strong", null, m.title), h("p", null, m.when)))) : null);

  const page1 = h("section", "sheet page-one",
    docHead(R["brand"]!, R["title"]!, R["subtitle"]!, sourceLabel, v.header.startedLine, `${v.header.updatedLine} · ${v.header.elapsed}`),
    h("div", "integrity", h("div", "badge", R["originBadge"]!), h("div", null, h("strong", null, R["originStrong"]!), h("p", null, R["originNote"]!))),
    p0,
    h("section", "section", sectionTitle(R["scanTitle"]!, R["scanHint"]!), h("div", "scan-grid", ...v.scan.map(scanCard)), h("div", "scan-grid flags", ...v.unknowns.map(scanCard))),
    exposure,
    h("section", "section", sectionTitle(R["synthTitle"]!, R["synthHint"]!), h("div", "handoff-box", h("div", "label", R["synthLabel"]!), h("p", null, v.synthesis))),
    h("section", "section", kvGrid(v.meta)),
    h("p", "sensitive", R["sensitive"]!),
    footer(R["footer1"]!, 1, 3, R));

  const page2 = h("section", "sheet",
    docHead(R["brand"]!, R["courseTitle"]!, R["courseSubtitle"]!, R["windowLabel"]!, v.header.windowLine, v.header.startedLine),
    h("section", "section first", sectionTitle(R["timelineTitle"]!, R["timelineHint"]!), timelineList(v.timeline)),
    h("section", "section", sectionTitle(R["careTitle"]!, R["careHint"]!), careGrid(v.care, R["careNone"]!)),
    h("section", "section", sectionTitle(R["provTitle"]!, R["provHint"]!),
      h("table", "source-table",
        h("thead", null, h("tr", null, h("th", null, R["prov.col.category"]!), h("th", null, R["prov.col.use"]!))),
        h("tbody", null,
          h("tr", null, h("td", null, h("span", "tag reported", R["tag.reported"]!)), h("td", null, R["prov.reported"]!)),
          h("tr", null, h("td", null, h("span", "tag derived", R["tag.derived"]!)), h("td", null, R["prov.derived"]!)),
          h("tr", null, h("td", null, h("span", "tag unknown", R["tag.unknown"]!)), h("td", null, R["prov.unknown"]!))))),
    h("div", "statement", R["statement"]!),
    footer(R["courseTitle"]!, 2, 3, R));

  const page3 = h("section", "sheet",
    docHead(R["annexBrand"]!, R["annexTitle"]!, R["annexSubtitle"]!, R["engineLabel"]!, R["engineValue"]!, R["engineSub"]!),
    h("div", "tech-banner", R["annexBanner"]!),
    h("section", "section", sectionTitle(R["stateTitle"]!, R["stateHint"]!), kvGrid(v.annex.state)),
    v.annex.risk.length ? h("section", "section", sectionTitle(R["riskTitle"]!, R["riskHint"]!),
      h("div", "risk-grid", ...v.annex.risk.map((r) => h("div", "risk-card", h("div", "name", r.k), h("div", "score", r.v), h("div", "scale", R["riskScale"]!))))) : null,
    h("section", "section", sectionTitle(R["signalsTitle"]!, R["signalsHint"]!),
      h("table", "signal-table",
        h("thead", null, h("tr", null, ...["col.signal", "col.value", "col.source", "col.ttl", "col.status"].map((k) => h("th", null, R[k]!)))),
        h("tbody", null, ...v.annex.signals.map((s) => h("tr", `tone-${s.tone}`, h("td", null, h("code", null, s.id)), h("td", null, s.value), h("td", null, s.source), h("td", null, s.ttl), h("td", "st", s.status)))))),
    h("section", "section", sectionTitle(R["guaranteeTitle"]!, R["guaranteeHint"]!), h("ul", "guarantees", ...["g1", "g2", "g3", "g4", "g5", "g6"].map((g) => h("li", null, R[g]!)))),
    h("div", "statement", R["annexStatement"]!),
    footer(R["annexSubtitle"]!, 3, 3, R));

  host.replaceChildren(page1, page2, page3);
}

export function renderRelatorio(host: HTMLElement, v: RelatorioView, R: Record<string, string>): void {
  const kids: (HTMLElement | null)[] = [
    h("header", "rel-head",
      h("p", "rel-brand", R["relBrand"]!),
      h("h1", null, R["relTitle"]!),
      h("p", "rel-sub", R["relSubtitle"]!),
      h("p", "rel-times", v.header.startedLine, h("span", "rel-elapsed", v.header.elapsed))),
    v.p0 ? h("div", "p0-banner", h("b", null, R["p0Badge"] ?? ""), h("p", null, v.p0)) : null,
    h("section", "rel-block",
      h("h2", null, R["relNow"]!),
      v.now.length ? h("dl", "rel-now", ...v.now.flatMap((kv) => [h("dt", null, kv.k), h("dd", null, kv.v)])) : h("p", "empty", R["relNowEmpty"]!)),
    h("section", "rel-block", h("h2", null, R["relTried"]!), careGrid(v.tried, R["careNone"]!)),
    h("section", "rel-block", h("h2", null, R["relTimeline"]!), timelineList(v.timeline)),
    h("p", "rel-privacy", R["relPrivacy"]!),
  ];
  host.replaceChildren(...kids.filter((k): k is HTMLElement => k !== null));
}

export function renderMessage(host: HTMLElement, text: string): void {
  host.replaceChildren(h("div", "waiting", h("span", "pulse"), h("p", null, text)));
}

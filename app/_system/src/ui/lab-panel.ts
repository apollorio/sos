/**
 * LAB PANEL (Ctrl+H) — a hidden operator view for the beta lab: the structured log of THIS session, what the engine has
 * learned (Pista, studies/004 patterns, compatibility only) and the lab simulator. It lives in memory only: nothing is
 * stored or sent, and it disappears with the page. The person in crisis never needs it; it never changes a decision.
 */
import type { StepResult } from "../core/domain/decision";
import type { Reg } from "../core/registry";
import type { Locale } from "./locale";
import { buildFacts } from "../core/logic/facts";
import { pistaRows } from "./pista";

const MAX = 300;

export interface LabPanel { record(r: StepResult): void; open(): void; close(): void; readonly isOpen: boolean }

export function attachLabPanel(reg: Reg, locale: Locale, doc: Document = document): LabPanel {
  const history: StepResult[] = [];
  let dialog: HTMLDialogElement | null = null;
  let tab: "log" | "pista" | "sim" = "log";

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const fmt = (ms: number) => { const s = Math.max(0, Math.round(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };

  const body = () => {
    const box = el("div", "lab-body");
    const last = history[history.length - 1];
    if (tab === "log") {
      const t0 = history[0]?.log.at ?? 0;
      const table = el("table", "lab-table");
      const head = el("tr");
      for (const h of ["t+", "faixa", "entrada", "regra → cartão"]) head.append(el("th", undefined, h));
      table.append(head);
      for (const r of [...history].reverse()) {
        const tr = el("tr", `lab-${r.log.band}`);
        const rule = r.log.why.commander ?? r.log.why.policyRule ?? "";
        tr.append(el("td", "num", fmt(r.log.at - t0)), el("td", undefined, r.log.band), el("td", undefined, r.log.input), el("td", undefined, `${rule} → ${r.output.card.cardId.replace(/^CARD_/, "")}${r.output.notice ? ` «${r.output.notice}»` : ""}`));
        table.append(tr);
      }
      box.append(el("p", "lab-note", `${history.length} passos nesta sessão · registro ${reg.data.meta.registryVersion} · nada é salvo nem enviado`), table);
    } else if (tab === "pista") {
      if (!last) box.append(el("p", "lab-note", "Ainda sem passos."));
      else {
        const facts = buildFacts(last.state, last.state.lastAt, reg).facts;
        const table = el("table", "lab-table");
        for (const row of pistaRows(last.state, facts, reg, (k) => locale.continuity?.strategyPhrases?.[k] ?? k)) {
          const tr = el("tr");
          tr.append(el("th", undefined, row.label), el("td", undefined, row.value), el("td", "lab-dim", row.note));
          table.append(tr);
        }
        box.append(el("p", "lab-note", "Padrão = compatibilidade com uma família de efeitos (estudos/004), nunca confirmação. A pessoa nunca vê esta tela."), table);
      }
    } else {
      const frame = el("iframe", "lab-frame");
      frame.src = "./lab/simulador.html";
      frame.title = "Simulador do laboratório";
      const link = el("a", "lab-link", "Abrir o simulador numa aba nova") as HTMLAnchorElement;
      link.href = "./lab/simulador.html";
      link.target = "_blank";
      link.rel = "noopener";
      box.append(link, frame);
    }
    return box;
  };

  const render = () => {
    if (!dialog) return;
    try { draw(dialog); } catch { dialog.replaceChildren(el("p", "lab-note", "O laboratório falhou nesta tela; o app continua normal.")); }
  };
  const draw = (dialog: HTMLDialogElement) => {
    const head = el("div", "lab-head");
    head.append(el("strong", undefined, "Laboratório · Ctrl+H"));
    const tabs = el("div", "lab-tabs");
    for (const [id, label] of [["log", "Registro"], ["pista", "Pista"], ["sim", "Simulador"]] as const) {
      const b = el("button", id === tab ? "lab-tab on" : "lab-tab", label);
      b.type = "button";
      b.addEventListener("click", () => { tab = id; render(); });
      tabs.append(b);
    }
    const close = el("button", "lab-close", "Fechar");
    close.type = "button";
    close.addEventListener("click", () => api.close());
    head.append(tabs, close);
    dialog.replaceChildren(head, body());
  };

  const api: LabPanel = {
    record(r) {
      history.push(r);
      if (history.length > MAX) history.splice(0, history.length - MAX);
      if (dialog?.open && tab !== "sim") render();
    },
    open() {
      if (!dialog) {
        dialog = el("dialog", "lab-panel");
        dialog.setAttribute("aria-label", "Laboratório: registro desta sessão");
        doc.body.append(dialog);
      }
      render();
      if (!dialog.open) dialog.showModal();
    },
    close() { dialog?.close(); },
    get isOpen() { return !!dialog?.open; },
  };

  doc.addEventListener("keydown", (e) => {
    if (e.ctrlKey && !e.altKey && (e.key === "h" || e.key === "H")) {
      e.preventDefault();
      // Isolated: an old browser without <dialog> must not reach the global error handler (fail to shell).
      try { if (api.isOpen) api.close(); else api.open(); } catch { /* lab only */ }
    }
  });
  return api;
}

/**
 * DOM renderer — dumb by design. It shows ONE card, turns handoff actions into real <a href>
 * links (tel:/sms:/wa.me, executed by the browser inside the user's gesture), and forwards taps.
 * No decision logic lives here.
 */
import type { StepResult } from "../core/domain/decision";
import type { Reg } from "../core/registry";
import { resolveCard, type Locale } from "./locale";
import { ambientBreath } from "./breath-pacer";

export interface UiHandlers {
  tap(cardInstanceId: string, actionId: string): void;
  text(text: string): void;
  chip(chipId: string): void;
}

/** The live flows' voice uses **bold** for the one thing to do. Rendered as text nodes + <strong> (never innerHTML). */
export function rich(host: HTMLElement, text: string): HTMLElement {
  text.split(/\*\*(.+?)\*\*/g).forEach((part, i) => {
    if (!part) return;
    if (i % 2) { const b = document.createElement("strong"); b.textContent = part; host.append(b); } else host.append(document.createTextNode(part));
  });
  return host;
}

export function renderStep(root: HTMLElement, r: StepResult, locale: Locale, reg: Reg, on: UiHandlers): void {
  const card = r.output.card;
  const c = resolveCard(card, locale, reg);
  const el = (tag: string, cls?: string, text?: string) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  const section = el("section", `card band-${card.band} kind-${card.kind}`);
  section.setAttribute("aria-live", card.band === "P0" ? "assertive" : "polite");
  if (r.output.notice) section.append(el("p", "notice", locale.notices[r.output.notice] ?? ""));
  section.append(el("h1", "title", c.title));
  if (c.body) section.append(rich(el("p", "body"), c.body));

  const actions = el("div", "actions");
  for (const a of c.actions) {
    const btn = a.href ? Object.assign(el("a", `btn ${a.emphasis}`, a.label), { href: a.href }) : el("button", `btn ${a.emphasis}`, a.label);
    if (a.href?.startsWith("https://")) { btn.setAttribute("target", "_blank"); btn.setAttribute("rel", "noopener noreferrer"); }
    btn.addEventListener("click", () => on.tap(card.instanceId, a.id)); // the link still navigates natively
    actions.append(btn);
  }
  section.append(actions);
  if (c.aside) section.append(el("p", "aside", c.aside));

  const chipButton = (chipId: string, group = "pending") => {
    const b = el("button", `chip g-${group}`, locale.chips[chipId]?.label ?? chipId); // g-*: one hue per area (app.css)
    b.setAttribute("type", "button");
    b.addEventListener("click", () => on.chip(chipId));
    return b;
  };
  for (const chip of r.output.chips.filter((c) => c.group === "pending")) section.append(chipButton(chip.chipId));

  // L23: a way out and a menu, always (never in P0: the engine sends no chips there).
  const groups: [string, string][] = [["body", "menuBody"], ["tools", "menuTools"], ["talk", "menuTalk"], ["report", "menuReport"]];
  const menu = el("nav", "menu");
  menu.setAttribute("aria-label", locale.shell["menuTools"] ?? "menu");
  for (const [g, heading] of groups) {
    const chips = r.output.chips.filter((c) => c.group === g);
    if (!chips.length) continue;
    const row = el("div", `menu-row g-${g}`);
    for (const chip of chips) row.append(chipButton(chip.chipId, g));
    menu.append(el("p", `menu-h g-${g}`, locale.shell[heading] ?? ""), row);
  }
  if (menu.childElementCount) section.append(menu);

  if (card.band !== "P0") {
    const form = el("form", "free-text") as HTMLFormElement;
    const input = Object.assign(el("input") as HTMLInputElement, { type: "text", maxLength: 280, placeholder: locale.shell["textPlaceholder"] ?? "", autocomplete: "off" });
    input.setAttribute("aria-label", locale.shell["textPlaceholder"] ?? "texto");
    form.append(input, el("button", "btn low", "↵"));
    form.addEventListener("submit", (ev) => { ev.preventDefault(); if (input.value.trim()) on.text(input.value); input.value = ""; });
    section.append(form);
  }

  // L27: the breathing orb lives behind the card, not in it (same node across renders, so the rhythm continues).
  const [orb, line] = ambientBreath(root, r.output.breath, locale);
  root.replaceChildren(orb, section, line);
  (section.querySelector(".btn.primary, .btn") as HTMLElement | null)?.focus({ preventScroll: true });
}

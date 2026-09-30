/**
 * RELATÓRIO / MODO MÉDICO (real Chromium, every third-party host blocked): the pages open from the menu, read this
 * device's episode, follow the app in real time from another tab, obey "Apagar agora", run under the strict CSP,
 * and the lab scenarios render the handoff document. Served from the repository root at /app/.
 *   npm run build && npm run e2e
 */
import { chromium } from "playwright-core";
import { serve, REPO_ROOT } from "./serve";

const server = serve(REPO_ROOT, 4176);
const APP = "http://localhost:4176/app/";
const browser = await chromium.launch({ executablePath: process.env["CHROMIUM"] ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const fail = (m: string) => { console.error("✖", m); process.exitCode = 1; };
const ok = (m: string) => console.log("✔", m);

try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, serviceWorkers: "block" });
  await ctx.route("**/*", (r) => (new URL(r.request().url()).hostname === "localhost" ? r.continue() : r.abort()));
  const csp: string[] = [];
  const app = await ctx.newPage();
  app.on("console", (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text()); });
  await app.goto(APP);
  await app.waitForSelector("html.js-ok .card");

  // 1. The menu: burger at the far right, the three DS cards and the discreet footer.
  await app.click("#burger");
  await app.waitForTimeout(700);
  (await app.locator("#burger").getAttribute("aria-expanded")) === "true" && (await app.locator(".card-nav--open .nav-card").count()) === 3 && (await app.locator(".nav-controls #btn-audio").count()) === 1
    ? ok("menu: the burger opens the CardNav (3 cards + text size / volume / play footer)") : fail("menu did not open");
  const med = await app.locator('a.nav-card-link[href="./medico.html"]').getAttribute("target");
  const rel = await app.locator('a.nav-card-link[href="./relatorio.html"]').getAttribute("target");
  med === "_blank" && rel === "_blank" ? ok("menu: «Modo Médico» and «Relatório de Emergência» open their own page, linked to the app") : fail("menu links");
  await app.keyboard.press("Escape");

  for (const label of ["Eu", "Respiro bem, sem dor no peito", "Consigo", "Muita, pânico"]) await app.getByRole("button", { name: label, exact: true }).click();

  // 2. Modo Médico reads the live episode from this device.
  const doc = await ctx.newPage();
  doc.on("console", (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text()); });
  await doc.goto(`${APP}medico.html`);
  await doc.waitForSelector(".sheet", { timeout: 5000 }).catch(() => undefined);
  const anxiety = await doc.locator(".scan", { hasText: "Ansiedade" }).locator(".value").textContent().catch(() => "");
  const seizure = await doc.locator(".scan", { hasText: "Convulsão" }).locator(".value").textContent().catch(() => "");
  (await doc.locator(".sheet").count()) === 3 && anxiety === "ansiedade muito alta" && seizure === "NÃO INFORMADO"
    ? ok("Modo Médico: 3 A4 sheets from the live journal; «ansiedade muito alta» reported, convulsão NÃO INFORMADO") : fail(`medico live: ${anxiety} / ${seizure}`);

  // 3. Real time: a tap in the app shows up in the open Modo Médico page.
  await app.getByRole("button", { name: "Fiz", exact: true }).click();
  await doc.waitForFunction(() => Array.from(document.querySelectorAll(".care")).some((c) => /água gelada no rosto/.test(c.textContent ?? "") && /FEITO/.test(c.textContent ?? "")), null, { timeout: 4000 }).then(
    () => ok("real time: «Fiz» in the app appears as FEITO in Modo Médico within seconds"), () => fail("Modo Médico did not update"));

  // 4. Relatório (friend view): no substance data, share text ready.
  const r = await ctx.newPage();
  await r.goto(`${APP}relatorio.html`);
  await r.waitForSelector(".rel-block", { timeout: 5000 }).catch(() => undefined);
  (await r.locator(".rel-block").count()) === 3 ? ok("Relatório de Emergência: now · already tried · timeline") : fail("relatorio blocks");

  // 5. "Apagar agora" in the app clears the open pages at once.
  await app.getByRole("button", { name: "Tô bem, quero encerrar" }).click().catch(() => undefined);
  const wipe = app.getByRole("button", { name: /Apagar/ });
  if (await wipe.count()) {
    await wipe.first().click();
    await doc.waitForSelector(".waiting", { timeout: 4000 }).then(() => ok("«Apagar agora»: the open Modo Médico page clears immediately"), () => fail("medico kept erased data"));
  } else fail("no «Apagar agora» after closing");

  // 6. Lab: a golden scenario renders the handoff document with exposure and combination warnings.
  await doc.goto(`${APP}medico.html?cenario=pista-bala-alcool-azulzinho`);
  await doc.waitForSelector(".exposure", { timeout: 5000 }).catch(() => undefined);
  (await doc.locator(".exposure tbody tr").count()) >= 4 && (await doc.locator(".mix").count()) === 2 && (await doc.locator("#scenario option").count()) > 2
    ? ok("lab: «Bala, álcool e azulzinho» shows the reported exposure, 2 combination warnings and a scenario picker") : fail("lab scenario");

  csp.length === 0 ? ok("CSP: no violation in the app, Modo Médico or Relatório") : fail(`CSP violations: ${csp.join(" | ")}`);
} finally {
  await browser.close();
  server.close();
}

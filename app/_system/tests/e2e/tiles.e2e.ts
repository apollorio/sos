/**
 * TILES → RELATÓRIO / MODO MÉDICO (real Chromium, every third-party host blocked): app/index.html is the tiles page
 * (no engine). What the person does there (enter, open a tile, tap an option, mark a task, tap 188) is journaled on the
 * device (app/tiles-journal.js) and the report pages render it; «Bateu forte» stays out of the Relatório (exposure is
 * professional-only); the ambient sound falls back to the synthesized pad when the file cannot load; «Salvar PDF»
 * prints the episode. PDFs are written to $TILES_PDF_DIR when set.
 *   npm run e2e:tiles   (CHROMIUM=<path to chrome> on Windows/macOS)
 */
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { serve, REPO_ROOT } from "./serve";

const server = serve(REPO_ROOT, 4177);
const APP = "http://localhost:4177/app/";
const browser = await chromium.launch({ executablePath: process.env["CHROMIUM"] ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const fail = (m: string) => { console.error("✖", m); process.exitCode = 1; };
const ok = (m: string) => console.log("✔", m);
const pdfDir = process.env["TILES_PDF_DIR"];

try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  await ctx.route("**/*", (r) => (new URL(r.request().url()).hostname === "localhost" ? r.continue() : r.abort()));
  const errors: string[] = [];
  const app = await ctx.newPage();
  app.on("pageerror", (e) => errors.push(e.message));
  await app.goto(APP);
  // tel: / sms: / wa.me are the phone's job: keep the page here, the journal listener (capture phase) still sees the tap.
  await app.evaluate(() => document.addEventListener("click", (e) => { const a = (e.target as Element).closest?.('a[href^="tel:"]'); if (a) e.preventDefault(); }));

  // 1. Enter: the journal starts; the sound starts (file blocked here → synthesized pad).
  await app.click("#pl-enter");
  await app.waitForFunction(() => document.getElementById("btn-audio")?.getAttribute("aria-pressed") === "true", null, { timeout: 8000 }).then(
    () => ok("sound: the file cannot load, the synthesized pad plays (button pressed)"), () => fail("sound did not start"));
  const status = await app.locator("#audio-status").textContent();
  /gerado no aparelho/.test(status ?? "") ? ok(`sound status: «${status}»`) : fail(`sound status: ${status}`);

  // 2. A real walk on the tiles.
  await app.waitForSelector('.option-box[data-flow="panico"]:not([inert])');
  await app.click('.option-box[data-flow="panico"]');
  await app.waitForSelector("#node-area .choice-btn");
  const chosen = (await app.locator("#node-area .choice-btn").first().textContent())!.trim();
  await app.locator("#node-area .choice-btn").first().click();
  let task = app.locator('#node-area .task-card[data-variant="default"]:not(.completed)').first();
  for (let i = 0; i < 4 && !(await task.count()); i++) {
    await app.waitForTimeout(900);
    const next = app.locator("#node-area .choice-btn, #node-area [data-goto]").first();
    if (await next.count()) await next.click();
    task = app.locator('#node-area .task-card[data-variant="default"]:not(.completed)').first();
  }
  await app.waitForTimeout(900);
  const taskLabel = (await task.locator(".t-label").textContent())!.trim();
  await task.click();
  await app.evaluate(() => (window as unknown as { SOS: { closeFlow(): void } }).SOS.closeFlow());
  await app.waitForTimeout(1000);
  await app.click('.sos-strip a[href="tel:188"]');
  await app.click('.option-box[data-flow="torto"]');
  await app.waitForSelector("#node-area .choice-btn");
  await app.getByRole("button", { name: "Bebi álcool e tô mal" }).click();
  await app.waitForTimeout(600);
  const kinds = await app.evaluate(() => JSON.parse(localStorage.getItem("sos_tiles_journal") ?? "{}").events?.map((e: { k: string }) => e.k).join(","));
  kinds === "start,flow,choice,task,tap,flow,choice" ? ok(`journal: ${kinds}`) : fail(`journal: ${kinds}`);
  const raw = await app.evaluate(() => localStorage.getItem("sos_tiles_journal") ?? "");
  /\d{8,}/.test(raw.replace(/"(at|startedAt|lastAt)":\d+/g, "")) ? fail("journal holds a long number (phone?)") : ok("journal: no phone numbers, only flow ids, app copy and service numbers");

  // 3. Relatório: the walk, without «Bateu forte».
  const rel = await ctx.newPage();
  await rel.goto(`${APP}relatorio.html`);
  await rel.waitForSelector("#doc .rel-block", { timeout: 6000 }).catch(() => undefined);
  const relText = (await rel.locator("#doc").innerText()).replace(/\s+/g, " ");
  relText.includes(chosen) && relText.includes(taskLabel) && relText.includes("ligar 188 (CVV)")
    ? ok("Relatório: tile, option, task done and the 188 tap are on the timeline") : fail(`Relatório: ${relText.slice(0, 300)}`);
  !/Bateu forte|álcool|usei algo/i.test(relText) ? ok("Relatório: «Bateu forte» / alcohol left out (professional-only)") : fail("Relatório shows exposure");
  !/Aguardando o app/.test(relText) ? ok("Relatório: no «Aguardando o app»") : fail("Relatório still waiting");

  // 4. Modo Médico: same walk + exposure, unknowns stay NÃO INFORMADO.
  const med = await ctx.newPage();
  await med.goto(`${APP}medico.html`);
  await med.waitForSelector(".sheet", { timeout: 6000 }).catch(() => undefined);
  const medText = (await med.locator("#doc").innerText()).replace(/\s+/g, " ");
  (await med.locator(".sheet").count()) === 3 && medText.includes("Bebi álcool e tô mal") && medText.includes(taskLabel)
    ? ok("Modo Médico: 3 sheets, exposure row «Bebi álcool e tô mal», task done") : fail(`Modo Médico: ${medText.slice(0, 300)}`);
  (await med.locator(".scan", { hasText: "Convulsão" }).locator(".value").textContent()) === "NÃO INFORMADO"
    ? ok("Modo Médico: convulsão NÃO INFORMADO (never «não»)") : fail("unknown red flag");

  // 5. Real time: a new tap in the app reaches the open Relatório.
  await app.evaluate(() => (window as unknown as { SOS: { closeFlow(): void } }).SOS.closeFlow());
  await app.waitForTimeout(1000);
  await app.click('.sos-strip a[href="tel:192"]');
  await rel.waitForFunction(() => /ligar 192 \(SAMU\)/.test(document.getElementById("doc")?.textContent ?? ""), null, { timeout: 6000 }).then(
    () => ok("real time: the 192 tap appears in the open Relatório"), () => fail("Relatório did not update"));

  // 6. «Salvar PDF» = print of the episode.
  await rel.emulateMedia({ media: "print" });
  const printed = await rel.evaluate(() => { const d = document.getElementById("doc")!; const r = d.getBoundingClientRect(); return { h: r.height, shown: getComputedStyle(d).display !== "none" }; });
  printed.shown && printed.h > 300 ? ok(`PDF: the episode (#doc, ${Math.round(printed.h)} px) is what prints`) : fail(`PDF: ${JSON.stringify(printed)}`);
  const relPdf = await rel.pdf({ format: "A4", printBackground: true });
  const medPdf = await med.pdf({ format: "A4", printBackground: true });
  relPdf.length > 20_000 && medPdf.length > 20_000 ? ok(`PDF: relatório ${Math.round(relPdf.length / 1024)} KB · modo médico ${Math.round(medPdf.length / 1024)} KB`) : fail("PDF too small");
  if (pdfDir) { writeFileSync(join(pdfDir, "relatorio.pdf"), relPdf); writeFileSync(join(pdfDir, "modo-medico.pdf"), medPdf); }

  errors.length ? fail(`page errors: ${errors.join(" | ")}`) : ok("no page errors on the tiles page");
} finally {
  await browser.close();
  server.close();
}

/**
 * OPENED FROM THE DISK (file://, real Chromium): double-clicking app/index.html must give the whole app, not only the
 * static 192 shell. Browsers refuse ES modules and SRI on file://, so app/file-boot.js adds the classic copy of the
 * same engine. Also: the menu opens Modo Médico from the disk and it follows the app live; one engine per page.
 *   npm run build && npx tsx tests/e2e/file.e2e.ts
 */
import { chromium } from "playwright-core";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { SITE } from "../../scripts/build";

const APP = pathToFileURL(resolve(SITE, "index.html")).href;
const MEDICO = pathToFileURL(resolve(SITE, "medico.html")).href;
const browser = await chromium.launch({ executablePath: process.env["CHROMIUM"] ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const fail = (m: string) => { console.error("✖", m); process.exitCode = 1; };
const ok = (m: string) => console.log("✔", m);

try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const app = await ctx.newPage();
  const csp: string[] = [];
  // The ambient piano lives on an external host (currently 404 → redirect, refused by media-src): reported, not a boot problem.
  app.on("console", (m) => { if (/Content Security Policy|Refused to (execute|load|apply)/i.test(m.text()) && !/module script|Loading media/i.test(m.text())) csp.push(m.text()); });
  const t0 = Date.now();
  await app.goto(APP);
  await app.waitForSelector("html.js-ok .card", { timeout: 8000 }).catch(() => undefined);
  const booted = (await app.locator("html.js-ok .card").count()) === 1;
  booted ? ok(`file://: the engine boots from the disk (first card in ${Date.now() - t0} ms), static panel hidden`) : fail("file://: only the static shell");
  (await app.locator("#sos").getAttribute("href")) === "tel:192" ? ok("file://: the 192 link is there") : fail("no 192");
  (await app.evaluate(() => document.querySelectorAll("#app > section.card").length)) === 1 ? ok("file://: one engine only (no double boot)") : fail("double boot");

  for (const label of ["Eu", "Respiro bem, sem dor no peito", "Consigo", "Muita, pânico"]) await app.getByRole("button", { name: label, exact: true }).click();
  (await app.locator(".card .title").textContent()) === "Água gelada no rosto." && (await app.locator(".ambient-breath.on").count()) === 1
    ? ok("file://: panic path → «Água gelada no rosto.» with the breathing orb") : fail("file://: flow broken");

  const doc = await ctx.newPage();
  await doc.goto(MEDICO);
  await doc.waitForSelector(".sheet", { timeout: 6000 }).catch(() => undefined);
  const anxiety = await doc.locator(".scan", { hasText: "Ansiedade" }).locator(".value").textContent().catch(() => "");
  anxiety === "ansiedade muito alta" ? ok("file://: Modo Médico reads the episode from the disk copy of the app") : fail(`file:// medico: «${anxiety}»`);
  await app.getByRole("button", { name: "Fiz", exact: true }).click();
  await doc.waitForFunction(() => Array.from(document.querySelectorAll(".care")).some((c) => /FEITO/.test(c.textContent ?? "")), null, { timeout: 7000 }).then(
    () => ok("file://: a tap in the app reaches the open Modo Médico page"), () => fail("file:// medico did not update"));
  csp.length === 0 ? ok("file://: no CSP violation besides the refused module") : fail(csp.join(" | "));
} finally {
  await browser.close();
}

/**
 * E2E smoke (real Chromium): INV-003 — the 192 affordance exists with JS disabled, with the
 * engine running, and after the engine crashes. Plus one real click-through to P0.
 *   npm run build && npm run e2e
 */
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { extname, join } from "node:path";

const TYPES: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webmanifest": "application/manifest+json" };
const server = createServer((req, res) => {
  const path = join("public", req.url === "/" ? "index.html" : req.url!.split("?")[0]!);
  if (!existsSync(path)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" }).end(readFileSync(path));
}).listen(4173);

const exe = process.env["CHROMIUM"] ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe });
const fail = (m: string) => { console.error("✖", m); process.exitCode = 1; };
const ok = (m: string) => console.log("✔", m);
const shots = process.env["SHOTS"];

try {
  // 1. No JavaScript at all.
  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 780 } });
  const p1 = await noJs.newPage();
  await p1.goto("http://localhost:4173/");
  (await p1.locator("#sos").getAttribute("href")) === "tel:192" ? ok("JS disabled: SOS bar → tel:192") : fail("no SOS bar without JS");
  (await p1.locator("#static-help").isVisible()) ? ok("JS disabled: static help panel visible") : fail("static panel hidden without JS");
  if (shots) await p1.screenshot({ path: `${shots}/0-no-js.png` });

  // 2. Engine running: two taps to P0 as a helper.
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
  const p = await ctx.newPage();
  await p.goto("http://localhost:4173/");
  await p.waitForSelector("html.js-ok .card");
  (await p.locator("#static-help").isVisible()) ? fail("static panel should hide when engine is alive") : ok("engine alive: static panel hidden, card shown");
  if (shots) await p.screenshot({ path: `${shots}/1-actor.png` });
  await p.getByRole("button", { name: "Outra pessoa" }).click();
  if (shots) await p.screenshot({ path: `${shots}/2-responds.png` });
  await p.getByRole("button", { name: "Não responde" }).click();
  const hero = p.locator(".card.band-P0 a.btn.primary");
  (await hero.getAttribute("href")) === "tel:192" ? ok("helper → 'Não responde' → P0 card with tel:192 hero (2 taps)") : fail("P0 hero missing");
  if (shots) await p.screenshot({ path: `${shots}/3-p0.png` });

  // 3. Engine crash → fail to shell.
  await p.evaluate(() => { setTimeout(() => { throw new Error("boom"); }); });
  await p.waitForTimeout(100);
  (await p.locator("#static-help").isVisible()) ? ok("engine crash: static help panel is back (fail to shell)") : fail("no fallback after crash");
  (await p.locator("#sos").isVisible()) ? ok("engine crash: SOS bar still visible") : fail("SOS bar gone after crash");

  // 4. Self flow with free text trigger.
  const p2 = await (await browser.newContext({ viewport: { width: 390, height: 780 } })).newPage();
  await p2.goto("http://localhost:4173/");
  await p2.waitForSelector("html.js-ok .card");
  await p2.getByRole("button", { name: "Eu" }).click();
  await p2.waitForSelector("text=Agora, algum destes?");
  await p2.fill(".free-text input", "não consigo respirar");
  await p2.press(".free-text input", "Enter");
  await p2.waitForSelector(".card.band-P0", { timeout: 3000 }).catch(() => undefined);
  (await p2.locator(".card.band-P0").count()) === 1 ? ok("free text 'não consigo respirar' → P0 (local trigger, no LLM)") : fail("text trigger failed");
  if (shots) await p2.screenshot({ path: `${shots}/4-text-p0.png` });
} finally {
  await browser.close();
  server.close();
}

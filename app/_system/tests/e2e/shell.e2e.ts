/**
 * E2E smoke (real Chromium): INV-003 — the 192 affordance exists with JS disabled, with the
 * engine running, and after the engine crashes. Plus one real click-through to P0, the beta notice,
 * a clean CSP, SRI, the v1 → v2 update and an offline reload. Served from the repository root at /app/.
 *   npm run build && npm run e2e
 */
import { chromium } from "playwright-core";
import { readFileSync, cpSync, mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeStamped, releaseChannel } from "../../scripts/build";
import { serve, REPO_ROOT } from "./serve";

// The site is the repository root, exactly as deployed: the app lives at /app/.
const server = serve(REPO_ROOT, 4173);
const APP = "http://localhost:4173/app/";

const exe = process.env["CHROMIUM"] ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe });
const fail = (m: string) => { console.error("✖", m); process.exitCode = 1; };
const ok = (m: string) => console.log("✔", m);
const shots = process.env["SHOTS"];

try {
  // 1. No JavaScript at all.
  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 780 } });
  const p1 = await noJs.newPage();
  await p1.goto(APP);
  (await p1.locator("#sos").getAttribute("href")) === "tel:192" ? ok("JS disabled: SOS bar → tel:192") : fail("no SOS bar without JS");
  (await p1.locator("#static-help").isVisible()) ? ok("JS disabled: static help panel visible") : fail("static panel hidden without JS");
  const channel = releaseChannel();
  (await p1.locator("html").getAttribute("data-channel")) === channel && (await p1.locator(".channel").isVisible()) === (channel === "beta")
    ? ok(`channel "${channel}": the beta notice is ${channel === "beta" ? "shown while the clinical release gate is red" : "hidden"}`) : fail("beta notice does not match the release gate");
  if (shots) await p1.screenshot({ path: `${shots}/0-no-js.png` });

  // 2. Engine running: two taps to P0 as a helper.
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
  const p = await ctx.newPage();
  const cspViolations: string[] = [];
  p.on("console", (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) cspViolations.push(m.text()); });
  await p.goto(APP);
  await p.waitForSelector("html.js-ok .card");
  (await p.locator("#static-help").isVisible()) ? fail("static panel should hide when engine is alive") : ok("engine alive: static panel hidden, card shown");
  if (shots) await p.screenshot({ path: `${shots}/1-actor.png` });
  await p.getByRole("button", { name: "Outra pessoa" }).click();
  if (shots) await p.screenshot({ path: `${shots}/2-responds.png` });
  await p.getByRole("button", { name: "Não responde" }).click();
  const hero = p.locator(".card.band-P0 a.btn.primary");
  (await hero.getAttribute("href")) === "tel:192" ? ok("helper → 'Não responde' → P0 card with tel:192 hero (2 taps)") : fail("P0 hero missing");
  if (shots) await p.screenshot({ path: `${shots}/3-p0.png` });
  cspViolations.length === 0 ? ok("CSP (default-src 'self', no inline script or style): no violation while booting and reaching P0") : fail(`CSP violations: ${cspViolations.join(" | ")}`);
  (await p.locator(".channel a").getAttribute("href")) === "./lab/" ? ok("the notice links to the beta lab (./lab/)") : fail("lab link missing");
  // Control: the policy is really enforced (otherwise "no violation" above would prove nothing).
  const inlineBlocked = await p.evaluate(() => { const s = document.createElement("script"); s.textContent = "window.__inline = 1"; document.head.append(s); return (window as unknown as { __inline?: number }).__inline === undefined; });
  inlineBlocked ? ok("CSP control: an injected inline script is refused") : fail("CSP is not enforced: inline script ran");

  (await p.locator(".menu").count()) === 0 ? ok("P0: no menu beside the emergency card (INV-029)") : fail("menu shown in P0");
  (await p.locator(".ambient-breath.on").count()) === 0 ? ok("P0: no breathing orb behind the emergency card (L27, INV-032)") : fail("orb shown in P0");

  // 3b. L21–L23 (audit 010): help first, the menu is there, and a pick opens that technique.
  const pm = await (await browser.newContext({ viewport: { width: 390, height: 780 } })).newPage();
  await pm.goto(APP);
  await pm.waitForSelector("html.js-ok .card");
  for (const label of ["Eu", "Respiro bem, sem dor no peito", "Consigo", "Muita, pânico"]) await pm.getByRole("button", { name: label, exact: true }).click();
  (await pm.locator(".card .title").textContent()) === "Água gelada no rosto." && (await pm.locator(".menu .chip").count()) >= 8
    ? ok("self in panic: the first help is cold water after 4 taps, with the menu of techniques and people below it") : fail(`first help ${await pm.locator(".card .title").textContent()}`);
  const orb = pm.locator(".breath-line.on");
  await pm.waitForTimeout(600);
  (await orb.count()) === 1 && /Inspira|Segura|Solta/.test((await orb.textContent()) ?? "") && (await pm.locator(".card .pacer").count()) === 0
    ? ok("the breathing orb breathes behind the card with its line, and no card is spent on breathing (L27)") : fail("ambient orb missing or a breathing card shown");
  const before = await pm.locator(".ambient-breath").elementHandle();
  await pm.getByRole("button", { name: "Hmmm (vibração)" }).click();
  (await pm.locator(".ambient-breath").elementHandle().then(async (h) => h && before ? h.evaluate((a, b) => a === b, before) : false))
    ? ok("the orb survives a card change (same node: the rhythm does not restart)") : fail("orb recreated on card change");
  (await pm.locator(".card .title").textContent()) === "Hmmm de boca fechada." ? ok("menu: picking «Hmmm (vibração)» opens that technique (L23)") : fail("menu pick did not open the technique");
  if (shots) await pm.screenshot({ path: `${shots}/5-menu.png`, fullPage: true });

  // 3c. Audit 014 (L30): discovery like a friend, and the hidden lab panel (Ctrl+H) with this session's log and Pista.
  const pd = await (await browser.newContext({ viewport: { width: 390, height: 780 } })).newPage();
  await pd.goto(APP);
  await pd.waitForSelector("html.js-ok .card");
  const said: string[] = [];
  const tapD = async (label: string) => { await pd.getByRole("button", { name: label, exact: true }).click(); said.push((await pd.locator(".card").textContent()) ?? ""); };
  for (const label of ["Eu", "Respiro bem, sem dor no peito", "Consigo", "Muita, pânico", "Fiz", "Sim, aqui comigo", "Fiz", "Tranquilo", "Fiz"]) await tapD(label);
  (await pd.locator(".card .title").textContent()) === "Como tá o corpo agora?"
    ? ok("discovery starts from the body: «Como tá o corpo agora?» after three helps (L30)") : fail(`expected the body question, got ${await pd.locator(".card .title").textContent()}`);
  await tapD("Acelerado, ligado, coração a mil");
  await tapD("Fiz");
  (await pd.locator(".card .title").textContent()) === "E essa energia puxa pra quê?"
    ? ok("then one gentle detail: «E essa energia puxa pra quê?»") : fail(`expected the energy question, got ${await pd.locator(".card .title").textContent()}`);
  said.every((t) => !/o que (você|a pessoa) usou/i.test(t)) ? ok("never «O que você usou?» on any screen of the walk") : fail("a screen asked what was used");
  (await pd.locator("dialog.lab-panel").count()) === 0 ? ok("lab panel: absent until asked for (no button, nothing in the DOM)") : fail("lab panel rendered without Ctrl+H");
  await pd.keyboard.press("Control+h");
  const panel = pd.locator("dialog.lab-panel");
  (await panel.isVisible()) && (await panel.locator(".lab-table tr").count()) >= 12
    ? ok(`Ctrl+H opens the lab panel with this session's log (${(await panel.locator(".lab-table tr").count()) - 1} steps)`) : fail("Ctrl+H did not open the log");
  await panel.getByRole("button", { name: "Pista" }).click();
  /acelerado/i.test((await panel.locator(".lab-table").textContent()) ?? "") ? ok("lab panel · Pista shows what the body feel was, for the operator only") : fail("Pista tab empty");
  if (shots) await pd.screenshot({ path: `${shots}/6-lab-panel.png` });
  await pd.keyboard.press("Control+h");
  !(await panel.isVisible()) ? ok("Ctrl+H again closes it") : fail("Ctrl+H did not close the panel");

  // 3d. The local copy runs straight from disk (file://): classic script, no module/SRI, same engine (audit 014).
  const pf = await (await browser.newContext({ viewport: { width: 390, height: 780 } })).newPage();
  const pageErrors: string[] = [];
  pf.on("pageerror", (e) => pageErrors.push(e.message));
  await pf.goto(`file://${join(REPO_ROOT, "app", "local.html")}`);
  await pf.waitForSelector("html.js-ok .card", { timeout: 5000 }).catch(() => undefined);
  (await pf.evaluate(() => document.documentElement.classList.contains("js-ok"))) && pageErrors.length === 0
    ? ok("app/local.html boots from file:// (engine alive, no page error)") : fail(`local.html did not boot from file:// ${pageErrors.join(" | ")}`);
  (await pf.locator("#sos").getAttribute("href")) === "tel:192" ? ok("app/local.html keeps the tel:192 bar") : fail("local.html lost the 192 bar");
  await pf.getByRole("button", { name: "Eu", exact: true }).click();
  await pf.keyboard.press("Control+h");
  (await pf.locator("dialog.lab-panel .lab-table tr").count()) >= 3 ? ok("Ctrl+H works in the local copy too") : fail("Ctrl+H missing in local.html");

  // 3. Engine crash → fail to shell.
  await p.evaluate(() => { setTimeout(() => { throw new Error("boom"); }); });
  await p.waitForTimeout(100);
  (await p.locator("#static-help").isVisible()) ? ok("engine crash: static help panel is back (fail to shell)") : fail("no fallback after crash");
  (await p.locator("#sos").isVisible()) ? ok("engine crash: SOS bar still visible") : fail("SOS bar gone after crash");

  // 4. Self flow with free text trigger.
  const p2 = await (await browser.newContext({ viewport: { width: 390, height: 780 } })).newPage();
  await p2.goto(APP);
  await p2.waitForSelector("html.js-ok .card");
  await p2.getByRole("button", { name: "Eu" }).click();
  await p2.waitForSelector("text=Agora, algum destes?");
  await p2.fill(".free-text input", "não consigo respirar");
  await p2.press(".free-text input", "Enter");
  await p2.waitForSelector(".card.band-P0", { timeout: 3000 }).catch(() => undefined);
  (await p2.locator(".card.band-P0").count()) === 1 ? ok("free text 'não consigo respirar' → P0 (local trigger, no LLM)") : fail("text trigger failed");
  if (shots) await p2.screenshot({ path: `${shots}/4-text-p0.png` });

  // 5. Subresource Integrity: a tampered bundle never runs; the static 192 shell stays (L11).
  //    Control first: the same interception with the original bytes must still boot (so the check below is not vacuous).
  const cctx = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 780 } });
  const cp = await cctx.newPage();
  await cp.route("**/assets/app.*.js", async (route) => { const res = await route.fetch(); await route.fulfill({ response: res, body: await res.text() }); });
  await cp.goto(APP);
  await cp.waitForSelector("html.js-ok .card", { timeout: 5000 }).catch(() => undefined);
  (await cp.evaluate(() => document.documentElement.classList.contains("js-ok"))) ? ok("SRI control: intercepted but untouched bundle boots") : fail("SRI control failed to boot");
  await cctx.close();
  const tctx = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 780 } });
  const tp = await tctx.newPage();
  await tp.route("**/assets/app.*.js", async (route) => {
    const res = await route.fetch();
    await route.fulfill({ response: res, body: (await res.text()) + "\n;window.__tampered=1;" });
  });
  await tp.goto(APP);
  await tp.waitForTimeout(800);
  (await tp.evaluate(() => (window as unknown as { __tampered?: number }).__tampered === undefined && !document.documentElement.classList.contains("js-ok")))
    ? ok("SRI: a tampered bundle is refused by the browser") : fail("tampered bundle executed");
  (await tp.locator("#static-help").isVisible()) && (await tp.locator("#sos").getAttribute("href")) === "tel:192"
    ? ok("SRI: static help + tel:192 remain after the refusal") : fail("no fallback after SRI refusal");
  await tctx.close();

  // 6. Update path: an installed v1 picks up a v2 deploy on the next load (no stale bundle for a year).
  const site = mkdtempSync(join(tmpdir(), "sos-deploy-"));
  const shell = join(site, "app");
  mkdirSync(shell);
  for (const f of ["index.html", "app.css", "sw.js", "manifest.webmanifest", "assets"]) cpSync(join(REPO_ROOT, "app", f), join(shell, f), { recursive: true });
  const srv2 = serve(site, 4174, { "cache-control": "no-cache" });
  try {
    const uctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
    const up = await uctx.newPage();
    await up.goto("http://localhost:4174/app/");
    await up.waitForSelector("html.js-ok .card");
    await up.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 8000 });
    const scope = await up.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.scope ?? "");
    scope === "http://localhost:4174/app/" ? ok("service worker scope is /app/ (the gateway at / is never intercepted)") : fail(`service worker scope ${scope}`);
    const v1src = await up.locator("script[type=module]").getAttribute("src");
    const v1 = readFileSync(join(shell, v1src!), "utf8");
    const s2 = writeStamped(shell, v1 + "\n/* deploy v2 */\n", channel);
    const changed = await up.evaluate(() => new Promise<boolean>((resolve) => {
      navigator.serviceWorker.addEventListener("controllerchange", () => resolve(true), { once: true });
      void navigator.serviceWorker.getRegistration().then((r) => r?.update());
      setTimeout(() => resolve(false), 8000);
    }));
    changed ? ok("update: the v1 install found and activated the v2 service worker") : fail("v2 service worker never took control");
    await up.reload();
    await up.waitForSelector("html.js-ok .card");
    const v2src = await up.locator("script[type=module]").getAttribute("src");
    const keys = await up.evaluate(() => caches.keys());
    v2src === `./${s2.file}` && keys.length === 1 && keys[0] === s2.version
      ? ok(`update: next load runs ${s2.file} from cache ${s2.version}; v1 cache deleted`) : fail(`still on ${v2src} with caches ${keys.join(",")}`);
    await uctx.setOffline(true);
    await up.reload();
    await up.waitForSelector("html.js-ok .card", { timeout: 5000 }).catch(() => undefined);
    (await up.locator("html.js-ok .card").count()) === 1 && (await up.locator("#sos").getAttribute("href")) === "tel:192"
      ? ok("offline: a reload with no network is served by the service worker (card + tel:192)") : fail("offline reload failed");
    await uctx.close();
  } finally {
    srv2.close();
  }
} finally {
  await browser.close();
  server.close();
}

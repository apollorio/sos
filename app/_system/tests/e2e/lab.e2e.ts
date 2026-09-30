/**
 * BETA LAB (real Chromium, every third-party host blocked): the gateway at / leads to the app at /app/, every lab
 * link resolves, a clinician's review and a tester's feedback survive a reload and download as files that
 * `npm run review:summary` reads, and "Apagar os dados do app" really resets the app.
 *   npm run build && npm run e2e
 */
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { serve, REPO_ROOT } from "./serve";
import { reviewSections, missions } from "../../scripts/lab/model";
import { summarize, type ReviewExport } from "../../scripts/review-summary";
import { REGISTRY_HASH } from "../../src/generated/registry.gen";
import { LOCALES, pickText } from "../../src/ui/locale";

const server = serve(REPO_ROOT, 4175);
const BASE = "http://localhost:4175";
const browser = await chromium.launch({ executablePath: process.env["CHROMIUM"] ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const fail = (m: string) => { console.error("✖", m); process.exitCode = 1; };
const ok = (m: string) => console.log("✔", m);
const firstQuestion = pickText(LOCALES["pt-BR"]!.cards["CARD_Q_ACTOR"]!.title, []);

try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, acceptDownloads: true });
  await ctx.route("**/*", (r) => (new URL(r.request().url()).hostname === "localhost" ? r.continue() : r.abort()));
  const page = await ctx.newPage();
  page.on("dialog", (d) => void d.accept());

  // 1. Gateway: the entrance at the repository root leads to the app at /app/ (relative links work on any host).
  await page.goto(`${BASE}/`);
  const help = await page.locator("#help-link").getAttribute("href");
  const dose = await page.locator("#dose-link").getAttribute("href");
  help === "./app/" && dose === "./somar/" ? ok("gateway: «ajuda» → ./app/ and «somar» → ./somar/ (relative, host-independent)") : fail(`gateway links ${help} ${dose}`);
  await page.locator("#help-link").click({ timeout: 5000 });
  await page.waitForURL(`${BASE}/app/`, { timeout: 5000 }).catch(() => undefined);
  await page.waitForSelector("html.js-ok .card", { timeout: 5000 }).catch(() => undefined);
  page.url() === `${BASE}/app/` && (await page.locator("html.js-ok .card").count()) === 1
    ? ok("gateway → tap «Preciso de ajuda» → the SOS app boots at /app/") : fail(`gateway click ended at ${page.url()}`);

  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  // 2. Lab hub: every tile resolves.
  await page.goto(`${BASE}/app/lab/`);
  const tiles = await page.locator("a.tile").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
  const statuses = await Promise.all(tiles.map(async (h) => (await page.request.get(h)).status()));
  tiles.length === 5 && statuses.every((s) => s === 200)
    ? ok(`lab hub: ${tiles.length} links resolve (app, missions, simulator, clinical review, previous version)`) : fail(`lab links ${tiles.map((t, i) => `${t}=${statuses[i]}`).join(" ")}`);

  // 3. Clinical review: every item is there, answers survive a reload, the export is what review:summary reads.
  const total = reviewSections().reduce((n, s) => n + s.items.length, 0);
  await page.goto(`${BASE}/app/lab/revisao.html`);
  (await page.locator("article.item").count()) === total ? ok(`review sheet: ${total} items, generated from the registry`) : fail("review item count");
  await page.fill("#r-name", "Dra. Teste");
  await page.fill("#r-reg", "CRM 0000");
  const items = page.locator("article.item");
  await items.nth(0).locator('input[value="aprovado"]').check();
  await items.nth(1).locator('input[value="ajustes"]').check();
  await items.nth(1).locator("textarea").fill("Sugiro outra palavra");
  await page.reload();
  (await page.locator("#progress").textContent()) === `2 de ${total} itens com parecer` && (await page.inputValue("#r-name")) === "Dra. Teste"
    && (await items.nth(1).locator("textarea").inputValue()) === "Sugiro outra palavra"
    ? ok("review: verdicts, comment and reviewer survive a reload (only in this browser)") : fail(`review state lost: ${await page.locator("#progress").textContent()}`);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#download")]);
  const review = JSON.parse(readFileSync((await dl.path())!, "utf8")) as ReviewExport;
  review.kind === "sos-apollo-clinical-review" && review.registryHash === REGISTRY_HASH && review.items.length === 2 && review.items[1]!.verdict === "ajustes"
    && review.reviewer?.registration === "CRM 0000" && dl.suggestedFilename() === `revisao-clinica-sos-${REGISTRY_HASH}.json`
    ? ok(`review: «Baixar retorno» downloads ${dl.suggestedFilename()} with both verdicts`) : fail(`review export ${JSON.stringify(review).slice(0, 200)}`);
  const sum = summarize(review);
  !sum.ready && sum.markdown.includes("| approved with changes | Sugiro outra palavra |")
    ? ok("review: the downloaded file feeds npm run review:summary (not ready: 2 items reviewed)") : fail(sum.markdown);
  // A later build changed the first item's text: its verdict must no longer count, and the item says why.
  await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem("sos-lab-review:v1")!) as { items: Record<string, { hash: string }> };
    const first = document.querySelector<HTMLElement>("article.item")!.dataset["id"]!;
    st.items[first]!.hash = "0000000000";
    localStorage.setItem("sos-lab-review:v1", JSON.stringify(st));
  });
  await page.reload();
  (await page.locator("article.item.changed").count()) === 1 && (await page.locator("#progress").textContent()) === `1 de ${total} itens com parecer`
    && (await items.nth(0).locator(".changed-note").isVisible())
    ? ok("review: a verdict given on text that changed since is flagged and no longer counts") : fail("changed-text flag");

  // 4. Tester missions: same round trip.
  const nMissions = missions().length + 1;
  await page.goto(`${BASE}/app/lab/roteiros.html`);
  (await page.locator("article.item").count()) === nMissions ? ok(`missions: ${nMissions} missions (golden scenarios + offline)`) : fail("mission count");
  const m1 = page.locator("article.item").nth(0);
  await m1.locator('input[value="como_descrito"]').check();
  await m1.locator('input[name^="q-"][value="4"]').check();
  await page.selectOption("#t-device", "Android");
  const [dl2] = await Promise.all([page.waitForEvent("download"), page.click("#download")]);
  const fb = JSON.parse(readFileSync((await dl2.path())!, "utf8")) as { kind: string; tester: { device: string }; missions: { id: string; result: string; clarity: string }[] };
  fb.kind === "sos-apollo-beta-feedback" && fb.tester.device === "Android" && fb.missions[0]?.id === "helper-unresponsive" && fb.missions[0].result === "como_descrito" && fb.missions[0].clarity === "4"
    ? ok("missions: feedback downloads as a file (nothing is sent anywhere)") : fail(`feedback export ${JSON.stringify(fb)}`);

  // 5. "Apagar os dados do app": an in-progress session is resumed on reload (control), then really gone after the reset.
  await page.goto(`${BASE}/app/`);
  await page.waitForSelector("html.js-ok .card");
  await page.getByRole("button", { name: "Eu", exact: true }).click();
  await page.waitForTimeout(300);
  await page.reload();
  await page.waitForSelector("html.js-ok .card");
  const resumed = (await page.locator(".card .title").textContent()) !== firstQuestion;
  await page.goto(`${BASE}/app/lab/`);
  await page.getByRole("button", { name: "Apagar os dados do app neste navegador" }).click();
  await page.waitForFunction(() => (document.getElementById("reset-out")?.textContent ?? "").startsWith("Pronto"), null, { timeout: 5000 }).catch(() => undefined);
  await page.goto(`${BASE}/app/`);
  await page.waitForSelector("html.js-ok .card");
  resumed && (await page.locator(".card .title").textContent()) === firstQuestion
    ? ok("reset: a resumed session is gone after «Apagar os dados do app»; the app starts at the first question") : fail(`reset failed (resumed before: ${resumed})`);

  // 6. The simulator runs from the lab with the real engine.
  await page.goto(`${BASE}/app/lab/simulador.html`);
  await page.waitForSelector("#phone-screen .card", { timeout: 5000 }).catch(() => undefined);
  (await page.locator("#phone-screen .card").count()) > 0 ? ok("simulator: runs from /app/lab/simulador.html") : fail("simulator did not render");

  errors.length === 0 ? ok("no page error on the app or any lab page") : fail(`page errors: ${errors.join(" | ")}`);
} finally {
  await browser.close();
  server.close();
}

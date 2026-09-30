/**
 * LEGACY PRODUCTION PAGE (/app/legacy.html; it was /app/ until the beta lab, audit 009) — the page in production (audit 003).
 * Real Chromium, every third-party host blocked (CDN down / offline conditions):
 *   · every flow keeps a clickable tel:192 on screen while its sheet is open
 *   · the persisted flow progress (node + risk level) expires after 12 h
 *   npm run e2e:legacy
 */
import { chromium, type Page } from "playwright-core";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { serve, REPO_ROOT } from "./serve";

const server = serve(REPO_ROOT, 4191);
const browser = await chromium.launch({ executablePath: process.env["CHROMIUM"] ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const fail = (m: string) => { console.error("✖", m); process.exitCode = 1; };
const ok = (m: string) => console.log("✔", m);

async function open(init?: (page: Page) => Promise<void>): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
  const page = await ctx.newPage();
  await page.route("**/*", (r) => (new URL(r.request().url()).hostname === "localhost" ? r.continue() : r.abort()));
  if (init) await init(page);
  await page.goto("http://localhost:4191/app/legacy.html");
  await page.waitForTimeout(3200);
  await page.mouse.click(195, 390); // preloader: "toque para entrar"
  await page.waitForTimeout(600);
  return page;
}

async function clickable192(page: Page): Promise<boolean> {
  return page.evaluate(() => Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href="tel:192"]')).some((a) => {
    for (let el: Element | null = a; el; el = el.parentElement) {
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0 || s.pointerEvents === "none") return false;
    }
    const r = a.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!top && (top === a || a.contains(top));
  }));
}

const data = JSON.parse(readFileSync(join(REPO_ROOT, "app/data.json"), "utf8")) as Record<string, { start?: string; nodes?: Record<string, unknown> }>;
const flows = ["torto", "panico", "realidade", "trava", "falar", "samu"];

try {
  for (const flow of flows) {
    const page = await open();
    await page.locator(`.option-box[data-flow="${flow}"]`).click();
    await page.waitForTimeout(1200);
    const sheetOpen = await page.evaluate(() => document.body.classList.contains("is-sheet-open"));
    sheetOpen && (await clickable192(page)) ? ok(`${flow}: tel:192 is clickable with the flow sheet open (CDN blocked)`) : fail(`${flow}: no clickable tel:192 while the sheet is open`);
    await page.context().close();
  }

  const panico = data["panico"]!;
  const start = panico.start ?? Object.keys(panico.nodes!)[0]!;
  const later = Object.keys(panico.nodes!).find((k) => k !== start)!;
  const seed = (savedAt: number | null) => async (page: Page) => {
    await page.addInitScript(([node, at]) => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem("sos_flow_progress", JSON.stringify({ flowKey: "panico", nodeId: node, taskDone: {}, risk: "EMERGENT", ...(at === null ? {} : { savedAt: at }) }));
    }, [later, savedAt] as const);
  };
  for (const [label, savedAt, expectResume] of [
    ["saved 1 h ago", Date.now() - 3_600_000, true],
    ["saved 13 h ago", Date.now() - 13 * 3_600_000, false],
    ["legacy entry without savedAt", null, false],
  ] as const) {
    const page = await open(seed(savedAt));
    await page.locator('.option-box[data-flow="panico"]').click();
    await page.waitForTimeout(1200);
    const resume = await page.locator(".resume-card").isVisible().catch(() => false);
    const left = await page.evaluate(() => localStorage.getItem("sos_flow_progress"));
    const good = expectResume ? resume : !resume && (left === null || !left.includes("EMERGENT"));
    good ? ok(`progress ${label}: ${expectResume ? "resume offered" : "discarded, risk level erased"}`) : fail(`progress ${label}: resume=${resume} stored=${left?.slice(0, 60)}`);
    await page.context().close();
  }
} finally {
  await browser.close();
  server.close();
}

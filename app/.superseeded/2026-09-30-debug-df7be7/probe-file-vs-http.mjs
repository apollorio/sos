/**
 * Runtime probe: open app/index.html via file:// AND via http://127.0.0.1
 * Writes NDJSON to debug-df7be7.log (session df7be7).
 */
import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// scripts/ → _system/ → app/ → repo root
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const APP = path.join(ROOT, "app");
const LOG = path.join(ROOT, "debug-df7be7.log");
const SID = "df7be7";

function log(hypothesisId, location, message, data, runId) {
  const line = JSON.stringify({
    sessionId: SID,
    runId,
    hypothesisId,
    location,
    message,
    data: data ?? {},
    timestamp: Date.now(),
  });
  fs.appendFileSync(LOG, line + "\n");
  console.log(line);
}

function startStatic(dir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url || "/", "http://127.0.0.1");
      let p = decodeURIComponent(u.pathname);
      if (p.endsWith("/")) p += "index.html";
      const file = path.join(dir, p);
      if (!file.startsWith(dir)) {
        res.writeHead(403);
        res.end();
        return;
      }
      fs.readFile(file, (err, buf) => {
        if (err) {
          res.writeHead(404);
          res.end("missing");
          return;
        }
        const ext = path.extname(file);
        const types = {
          ".html": "text/html; charset=utf-8",
          ".js": "text/javascript; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".webmanifest": "application/manifest+json",
          ".json": "application/json",
        };
        res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
        res.end(buf);
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

async function runOnce(browser, url, runId) {
  const page = await browser.newPage();
  const consoleMsgs = [];
  const pageErrors = [];
  const reqFails = [];

  page.on("console", (m) => consoleMsgs.push({ type: m.type(), text: m.text() }));
  page.on("pageerror", (e) => pageErrors.push(String(e && e.message ? e.message : e)));
  page.on("requestfailed", (r) =>
    reqFails.push({ url: r.url(), error: r.failure() && r.failure().errorText }),
  );

  log("H0", "probe-file-vs-http.mjs:nav", "navigating", { url }, runId);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
  } catch (e) {
    log("H1", "probe-file-vs-http.mjs:goto-fail", "goto failed", { error: String(e) }, runId);
  }

  await page.waitForTimeout(3500);

  const snap = await page.evaluate(() => {
    const app = document.getElementById("app");
    const help = document.getElementById("static-help");
    const mod = document.querySelector('script[type="module"][src*="assets/app."]');
    return {
      protocol: location.protocol,
      href: location.href,
      origin: location.origin,
      jsOk: document.documentElement.classList.contains("js-ok"),
      appKids: app ? app.childElementCount : -1,
      appHTML: app ? app.innerHTML.slice(0, 280) : null,
      staticDisplay: help ? getComputedStyle(help).display : null,
      staticVisible: help ? help.offsetParent !== null || getComputedStyle(help).display !== "none" : null,
      hasModuleTag: !!mod,
      moduleSrc: mod ? mod.getAttribute("src") : null,
      integrity: mod ? mod.getAttribute("integrity") : null,
      scripts: Array.from(document.scripts).map((s) => s.src || s.getAttribute("src") || "(inline)"),
    };
  });

  log("H0", "probe-file-vs-http.mjs:snap", "DOM snapshot", snap, runId);
  log("H1", "probe-file-vs-http.mjs:console", "console + errors", {
    consoleMsgs: consoleMsgs.slice(0, 40),
    pageErrors,
    reqFails: reqFails.slice(0, 30),
  }, runId);

  await page.close();
  return snap;
}

const browser = await chromium.launch({
  headless: true,
  channel: process.env.PW_CHANNEL || undefined,
}).catch(async () => {
  // fallback: look for chrome
  return chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      "C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
  });
});

try {
  const fileUrl = pathToFileURL(path.join(APP, "index.html")).href;
  const fileSnap = await runOnce(browser, fileUrl, "file");

  const { server, port } = await startStatic(APP);
  const httpUrl = `http://127.0.0.1:${port}/index.html`;
  const httpSnap = await runOnce(browser, httpUrl, "http");
  server.close();

  log("H0", "probe-file-vs-http.mjs:compare", "file vs http verdict", {
    file: { jsOk: fileSnap.jsOk, appKids: fileSnap.appKids, staticDisplay: fileSnap.staticDisplay },
    http: { jsOk: httpSnap.jsOk, appKids: httpSnap.appKids, staticDisplay: httpSnap.staticDisplay },
    engineAliveOnHttp: !!httpSnap.jsOk && httpSnap.appKids > 0,
    engineAliveOnFile: !!fileSnap.jsOk && fileSnap.appKids > 0,
  }, "compare");
} finally {
  await browser.close();
}

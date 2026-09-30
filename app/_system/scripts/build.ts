/**
 * BUILD — bundles the engine and stamps the app shell IN PLACE in /app (the deployed folder; the repository root
 * is the site: / = gateway, /app/ = SOS), so a deploy can never be shadowed by an old cache:
 *   app/assets/app.<sha256:12>.js     content-addressed, served immutable (/_headers)
 *   app/index.html                    <script type="module" src="./assets/app.<hash>.js" integrity="sha384-…">
 *                                     <html data-channel="beta|release"> — "beta" while `registry:lint --release` is red
 *   app/assets/report.<sha256:12>.js  Relatório / Modo Médico pages (live view of this device's episode)
 *   app/medico.html, app/relatorio.html  stamped like index.html (bundle + SRI + channel)
 *   app/assets/{app,report}.<hash>.classic.js  the same code as a classic script, loaded by app/file-boot.js ONLY when a
 *                                     page is opened from the disk (file://), where browsers refuse modules + SRI
 *   app/sw.js                         VERSION = hash of every shell file; SHELL lists the hashed bundles
 * Every path is relative, so the same files work at /app/ on production and on any preview host.
 *
 *   npm run build              write
 *   npm run build -- --check   exit 1 if app/ is not exactly what the current sources produce
 */
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, mkdirSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { lintRegistry } from "./registry-lint";

/** The deployed app folder, relative to app/_system (where every npm script runs). */
export const SITE = "..";
export type Channel = "beta" | "release";
/** Pages that load the report bundle (live Relatório / Modo Médico). Stamped only when present in the folder. */
export const REPORT_PAGES = ["medico.html", "relatorio.html"] as const;
export interface StampedReport { file: string; integrity: string; classic: string | null; pages: Record<string, string> }
export interface Stamped { file: string; integrity: string; classic: string | null; version: string; channel: Channel; html: string; sw: string; report: StampedReport | null }
/** Classic (IIFE) copies of the bundles, for pages opened from the disk. Omitted → whatever is in `dir/assets`. */
export interface ClassicBundles { app?: string | null; report?: string | null }

const SCRIPT_TAG = /<script type="module" src="[^"]*"[^>]*><\/script>/;
const HTML_TAG = /<html lang="pt-BR" data-channel="[a-z]+">/;
const VERSION_LINE = /const VERSION = "[^"]*";[^\n]*/;
const SHELL_LINE = /const SHELL = \[[^\]]*\];/;
const APP_BUNDLE = /^app\.[0-9a-f]+\.js$/;
const REPORT_BUNDLE = /^report\.[0-9a-f]+\.js$/;
const APP_CLASSIC = /^app\.[0-9a-f]+\.classic\.js$/;
const REPORT_CLASSIC = /^report\.[0-9a-f]+\.classic\.js$/;
/** The file:// loader tag. Optional in a page; when present its data-bundle is stamped with the classic bundle. */
const FILE_TAG = /<script src="\.\/file-boot\.js" data-bundle="[^"]*" defer><\/script>/;

const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 12);
const sri = (s: string) => `sha384-${createHash("sha384").update(s).digest("base64")}`;

/** CLAUDE.md rule 8, made visible: nothing presents itself as final while clinical copy is unreviewed. */
export function releaseChannel(): Channel {
  return lintRegistry({ release: true }).errors.length === 0 ? "release" : "beta";
}

function stampPage(html0: string, name: string, channel: Channel, file: string, integrity: string, classic: string | null): string {
  if (!SCRIPT_TAG.test(html0)) throw new Error(`${name}: module script tag not found`);
  if (!HTML_TAG.test(html0)) throw new Error(`${name}: <html lang="pt-BR" data-channel="…"> not found`);
  const html = html0
    .replace(HTML_TAG, `<html lang="pt-BR" data-channel="${channel}">`)
    .replace(SCRIPT_TAG, `<script type="module" src="./${file}" integrity="${integrity}"></script>`);
  return classic && FILE_TAG.test(html) ? html.replace(FILE_TAG, `<script src="./file-boot.js" data-bundle="./${classic}" defer></script>`) : html;
}

/** A bundle currently in `dir/assets` (so `stamp(dir, js, channel)` still works with three arguments). */
function existing(dir: string, re: RegExp): string | null {
  const a = join(dir, "assets");
  if (!existsSync(a)) return null;
  const f = readdirSync(a).find((x) => re.test(x));
  return f ? readFileSync(join(a, f), "utf8") : null;
}

/** Pure: given the bundle text(s), the channel and the current shell files, compute every stamped artifact. */
export function stamp(dir: string, js: string, channel: Channel, reportJs?: string | null, classicIn: ClassicBundles = {}): Stamped {
  const file = `assets/app.${sha(js)}.js`;
  const integrity = sri(js);
  const acjs = classicIn.app === undefined ? existing(dir, APP_CLASSIC) : classicIn.app;
  const classic = acjs ? `assets/app.${sha(acjs)}.classic.js` : null;
  const html = stampPage(readFileSync(join(dir, "index.html"), "utf8"), "index.html", channel, file, integrity, classic);

  const pagesHere = REPORT_PAGES.filter((p) => existsSync(join(dir, p)));
  const rjs = pagesHere.length ? (reportJs === undefined ? existing(dir, REPORT_BUNDLE) : reportJs) : null;
  let report: StampedReport | null = null;
  if (rjs) {
    const rfile = `assets/report.${sha(rjs)}.js`;
    const rint = sri(rjs);
    const rcjs = classicIn.report === undefined ? existing(dir, REPORT_CLASSIC) : classicIn.report;
    const rclassic = rcjs ? `assets/report.${sha(rcjs)}.classic.js` : null;
    const pages: Record<string, string> = {};
    for (const p of pagesHere) pages[p] = stampPage(readFileSync(join(dir, p), "utf8"), p, channel, rfile, rint, rclassic);
    report = { file: rfile, integrity: rint, classic: rclassic, pages };
  }
  const fileBoot = existsSync(join(dir, "file-boot.js"));

  const h = createHash("sha256").update(js).update(html)
    .update(readFileSync(join(dir, "app.css"))).update(readFileSync(join(dir, "manifest.webmanifest")));
  if (report) {
    h.update(rjs!);
    for (const p of Object.keys(report.pages).sort()) h.update(report.pages[p]!);
    if (existsSync(join(dir, "report.css"))) h.update(readFileSync(join(dir, "report.css")));
  }
  if (fileBoot) h.update(readFileSync(join(dir, "file-boot.js")));
  const version = `sos-${h.digest("hex").slice(0, 12)}`;
  const shell = ["./", "./index.html", "./app.css", `./${file}`, "./manifest.webmanifest"];
  if (report) shell.push(...Object.keys(report.pages).map((p) => `./${p}`), ...(existsSync(join(dir, "report.css")) ? ["./report.css"] : []), `./${report.file}`);
  // Every page loads the file:// loader (it returns at once on http): it must be precached, or an offline reload would
  // get index.html back for it and the parse error would take the engine down (fail to shell).
  if (fileBoot) shell.push("./file-boot.js");
  const sw0 = readFileSync(join(dir, "sw.js"), "utf8");
  if (!VERSION_LINE.test(sw0) || !SHELL_LINE.test(sw0)) throw new Error("sw.js: VERSION or SHELL line not found");
  const sw = sw0
    .replace(VERSION_LINE, `const VERSION = "${version}"; // stamped by scripts/build.ts from the content of every shell file`)
    .replace(SHELL_LINE, `const SHELL = [${shell.map((s) => JSON.stringify(s)).join(", ")}];`);
  return { file, integrity, classic, version, channel, html, sw, report };
}

/** Writes a stamped deploy into `dir`, removing superseded bundles (a deploy replaces the whole shell). */
export function writeStamped(dir: string, js: string, channel: Channel, reportJs?: string | null, classicIn: ClassicBundles = {}): Stamped {
  const acjs = classicIn.app === undefined ? existing(dir, APP_CLASSIC) : classicIn.app;
  const rjs = reportJs === undefined ? existing(dir, REPORT_BUNDLE) : reportJs;
  const rcjs = classicIn.report === undefined ? existing(dir, REPORT_CLASSIC) : classicIn.report;
  const s = stamp(dir, js, channel, rjs, { app: acjs, report: rcjs });
  mkdirSync(join(dir, "assets"), { recursive: true });
  for (const f of readdirSync(join(dir, "assets"))) {
    if (APP_BUNDLE.test(f) && `assets/${f}` !== s.file) unlinkSync(join(dir, "assets", f));
    if (s.classic && APP_CLASSIC.test(f) && `assets/${f}` !== s.classic) unlinkSync(join(dir, "assets", f));
    if (s.report && REPORT_BUNDLE.test(f) && `assets/${f}` !== s.report.file) unlinkSync(join(dir, "assets", f));
    if (s.report?.classic && REPORT_CLASSIC.test(f) && `assets/${f}` !== s.report.classic) unlinkSync(join(dir, "assets", f));
  }
  writeFileSync(join(dir, s.file), js);
  if (s.classic && acjs) writeFileSync(join(dir, s.classic), acjs);
  writeFileSync(join(dir, "index.html"), s.html);
  if (s.report) {
    if (rjs) writeFileSync(join(dir, s.report.file), rjs);
    if (s.report.classic && rcjs) writeFileSync(join(dir, s.report.classic), rcjs);
    for (const [p, html] of Object.entries(s.report.pages)) writeFileSync(join(dir, p), html);
  }
  writeFileSync(join(dir, "sw.js"), s.sw);
  return s;
}

/** Problems that make the committed app/ differ from what the current sources produce (empty = up to date). */
export function checkStamped(dir: string, js: string, channel: Channel, reportJs?: string | null, classicIn: ClassicBundles = {}): string[] {
  const s = stamp(dir, js, channel, reportJs, classicIn);
  const listed = existsSync(join(dir, "assets")) ? readdirSync(join(dir, "assets")) : [];
  const bundles = listed.filter((f) => APP_BUNDLE.test(f));
  const reports = listed.filter((f) => REPORT_BUNDLE.test(f));
  const same = (f: string, text: string) => existsSync(join(dir, f)) && readFileSync(join(dir, f), "utf8") === text;
  return [
    !existsSync(join(dir, s.file)) && `missing app/${s.file}`,
    existsSync(join(dir, s.file)) && readFileSync(join(dir, s.file), "utf8") !== js && `app/${s.file} differs from the current sources`,
    bundles.some((f) => `assets/${f}` !== s.file) && `stale bundles in app/assets: ${bundles.filter((f) => `assets/${f}` !== s.file).join(", ")}`,
    readFileSync(join(dir, "index.html"), "utf8") !== s.html && "app/index.html is not stamped for the current bundle and channel",
    s.classic && classicIn.app && !same(s.classic, classicIn.app) && `app/${s.classic} is missing or differs from the current sources`,
    listed.some((f) => APP_CLASSIC.test(f) && `assets/${f}` !== s.classic) && "stale classic app bundle in app/assets",
    s.report?.classic && classicIn.report && !same(s.report.classic, classicIn.report) && `app/${s.report.classic} is missing or differs from the current sources`,
    listed.some((f) => REPORT_CLASSIC.test(f) && `assets/${f}` !== s.report?.classic) && "stale classic report bundle in app/assets",
    s.report && reportJs && !same(s.report.file, reportJs) && `app/${s.report.file} is missing or differs from the current sources`,
    s.report && reports.some((f) => `assets/${f}` !== s.report!.file) && `stale report bundles in app/assets: ${reports.filter((f) => `assets/${f}` !== s.report!.file).join(", ")}`,
    ...(s.report ? Object.entries(s.report.pages).filter(([p, html]) => !same(p, html)).map(([p]) => `app/${p} is not stamped for the current report bundle and channel`) : []),
    readFileSync(join(dir, "sw.js"), "utf8") !== s.sw && "app/sw.js VERSION/SHELL is stale",
  ].filter((p): p is string => typeof p === "string");
}

const esbuildOptions = { bundle: true, target: "es2020", minify: true, write: false, charset: "utf8" as const, legalComments: "none" as const };
const pack = async (entry: string, format: "esm" | "iife") => (await build({ entryPoints: [entry], format, ...esbuildOptions })).outputFiles![0]!.text;

export const bundle = () => pack("src/runtime/boot.ts", "esm");

export const bundleReport = () => pack("src/report/boot.ts", "esm");
/** Same code as classic scripts: only for pages opened from the disk (see app/file-boot.js). */
export const bundleClassic = async (): Promise<Required<ClassicBundles>> => ({ app: await pack("src/runtime/boot.ts", "iife"), report: await pack("src/report/boot.ts", "iife") });

if (process.argv[1]?.endsWith("build.ts")) {
  const js = await bundle();
  const rjs = await bundleReport();
  const classic = await bundleClassic();
  const channel = releaseChannel();
  if (process.argv.includes("--check")) {
    const problems = checkStamped(SITE, js, channel, rjs, classic);
    if (problems.length) { for (const p of problems) console.error(`✖ ${p}`); console.error("Run: npm run build"); process.exit(1); }
    const s = stamp(SITE, js, channel, rjs, classic);
    console.log(`✔ app/ is stamped for the current sources (${s.file}${s.report ? ` + ${s.report.file}` : ""}, ${s.version}, channel ${channel})`);
  } else {
    const s = writeStamped(SITE, js, channel, rjs, classic);
    console.log(`✔ app/${s.file} ${(js.length / 1024).toFixed(1)} KB · ${s.integrity.slice(0, 22)}…${s.report ? ` · app/${s.report.file} ${(rjs.length / 1024).toFixed(1)} KB` : ""} · sw ${s.version} · channel ${channel}`);
  }
}

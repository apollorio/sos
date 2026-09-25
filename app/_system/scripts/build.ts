/**
 * BUILD — bundles the engine and stamps the app shell IN PLACE in /app (the deployed folder; the repository root
 * is the site: / = gateway, /app/ = SOS), so a deploy can never be shadowed by an old cache:
 *   app/assets/app.<sha256:12>.js  content-addressed, served immutable (/_headers)
 *   app/index.html                 <script type="module" src="./assets/app.<hash>.js" integrity="sha384-…">
 *                                  <html data-channel="beta|release"> — "beta" while `registry:lint --release` is red
 *   app/sw.js                      VERSION = hash of every shell file; SHELL lists the hashed bundle
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
export interface Stamped { file: string; integrity: string; version: string; channel: Channel; html: string; sw: string }

const SCRIPT_TAG = /<script type="module" src="[^"]*"[^>]*><\/script>/;
const HTML_TAG = /<html lang="pt-BR" data-channel="[a-z]+">/;
const VERSION_LINE = /const VERSION = "[^"]*";[^\n]*/;
const SHELL_LINE = /const SHELL = \[[^\]]*\];/;

/** CLAUDE.md rule 8, made visible: nothing presents itself as final while clinical copy is unreviewed. */
export function releaseChannel(): Channel {
  return lintRegistry({ release: true }).errors.length === 0 ? "release" : "beta";
}

/** Pure: given the bundle text, the channel and the current shell files, compute every stamped artifact. */
export function stamp(dir: string, js: string, channel: Channel): Stamped {
  const hash = createHash("sha256").update(js).digest("hex").slice(0, 12);
  const file = `assets/app.${hash}.js`;
  const integrity = `sha384-${createHash("sha384").update(js).digest("base64")}`;
  const html0 = readFileSync(join(dir, "index.html"), "utf8");
  if (!SCRIPT_TAG.test(html0)) throw new Error("index.html: module script tag not found");
  if (!HTML_TAG.test(html0)) throw new Error('index.html: <html lang="pt-BR" data-channel="…"> not found');
  const html = html0
    .replace(HTML_TAG, `<html lang="pt-BR" data-channel="${channel}">`)
    .replace(SCRIPT_TAG, `<script type="module" src="./${file}" integrity="${integrity}"></script>`);
  const version = `sos-${createHash("sha256")
    .update(js).update(html)
    .update(readFileSync(join(dir, "app.css"))).update(readFileSync(join(dir, "manifest.webmanifest")))
    .digest("hex").slice(0, 12)}`;
  const sw0 = readFileSync(join(dir, "sw.js"), "utf8");
  if (!VERSION_LINE.test(sw0) || !SHELL_LINE.test(sw0)) throw new Error("sw.js: VERSION or SHELL line not found");
  const sw = sw0
    .replace(VERSION_LINE, `const VERSION = "${version}"; // stamped by scripts/build.ts from the content of every shell file`)
    .replace(SHELL_LINE, `const SHELL = ["./", "./index.html", "./app.css", "./${file}", "./manifest.webmanifest"];`);
  return { file, integrity, version, channel, html, sw };
}

/** Writes a stamped deploy into `dir`, removing superseded bundles (a deploy replaces the whole shell). */
export function writeStamped(dir: string, js: string, channel: Channel): Stamped {
  const s = stamp(dir, js, channel);
  mkdirSync(join(dir, "assets"), { recursive: true });
  for (const f of readdirSync(join(dir, "assets"))) if (/^app\.[0-9a-f]+\.js$/.test(f) && `assets/${f}` !== s.file) unlinkSync(join(dir, "assets", f));
  writeFileSync(join(dir, s.file), js);
  writeFileSync(join(dir, "index.html"), s.html);
  writeFileSync(join(dir, "sw.js"), s.sw);
  return s;
}

/** Problems that make the committed app/ differ from what the current sources produce (empty = up to date). */
export function checkStamped(dir: string, js: string, channel: Channel): string[] {
  const s = stamp(dir, js, channel);
  const bundles = existsSync(join(dir, "assets")) ? readdirSync(join(dir, "assets")).filter((f) => /^app\.[0-9a-f]+\.js$/.test(f)) : [];
  return [
    !existsSync(join(dir, s.file)) && `missing app/${s.file}`,
    existsSync(join(dir, s.file)) && readFileSync(join(dir, s.file), "utf8") !== js && `app/${s.file} differs from the current sources`,
    bundles.some((f) => `assets/${f}` !== s.file) && `stale bundles in app/assets: ${bundles.filter((f) => `assets/${f}` !== s.file).join(", ")}`,
    readFileSync(join(dir, "index.html"), "utf8") !== s.html && "app/index.html is not stamped for the current bundle and channel",
    readFileSync(join(dir, "sw.js"), "utf8") !== s.sw && "app/sw.js VERSION/SHELL is stale",
  ].filter((p): p is string => typeof p === "string");
}

export async function bundle(): Promise<string> {
  const r = await build({ entryPoints: ["src/runtime/boot.ts"], bundle: true, format: "esm", target: "es2020", minify: true, write: false, charset: "utf8", legalComments: "none" });
  return r.outputFiles[0]!.text;
}

if (process.argv[1]?.endsWith("build.ts")) {
  const js = await bundle();
  const channel = releaseChannel();
  if (process.argv.includes("--check")) {
    const problems = checkStamped(SITE, js, channel);
    if (problems.length) { for (const p of problems) console.error(`✖ ${p}`); console.error("Run: npm run build"); process.exit(1); }
    const s = stamp(SITE, js, channel);
    console.log(`✔ app/ is stamped for the current sources (${s.file}, ${s.version}, channel ${channel})`);
  } else {
    const s = writeStamped(SITE, js, channel);
    console.log(`✔ app/${s.file} ${(js.length / 1024).toFixed(1)} KB · ${s.integrity.slice(0, 22)}… · sw ${s.version} · channel ${channel}`);
  }
}

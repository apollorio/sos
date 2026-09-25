/**
 * BUILD — bundles the engine and stamps the static shell so a deploy can never be shadowed by an old cache:
 *   public/assets/app.<sha256:12>.js  content-addressed, served immutable (_headers)
 *   public/index.html                 <script type="module" src="/assets/app.<hash>.js" integrity="sha384-…">
 *   public/sw.js                      VERSION = hash of every shell file; SHELL lists the hashed bundle
 *
 *   npm run build              write
 *   npm run build -- --check   exit 1 if public/ is not exactly what the current sources produce
 */
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, mkdirSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface Stamped { file: string; integrity: string; version: string; html: string; sw: string }

const SCRIPT_TAG = /<script type="module" src="[^"]*"[^>]*><\/script>/;
const VERSION_LINE = /const VERSION = "[^"]*";[^\n]*/;
const SHELL_LINE = /const SHELL = \[[^\]]*\];/;

/** Pure: given the bundle text and the current shell files, compute every stamped artifact. */
export function stamp(dir: string, js: string): Stamped {
  const hash = createHash("sha256").update(js).digest("hex").slice(0, 12);
  const file = `assets/app.${hash}.js`;
  const integrity = `sha384-${createHash("sha384").update(js).digest("base64")}`;
  const html0 = readFileSync(join(dir, "index.html"), "utf8");
  if (!SCRIPT_TAG.test(html0)) throw new Error("index.html: module script tag not found");
  const html = html0.replace(SCRIPT_TAG, `<script type="module" src="/${file}" integrity="${integrity}"></script>`);
  const version = `sos-${createHash("sha256")
    .update(js).update(html)
    .update(readFileSync(join(dir, "app.css"))).update(readFileSync(join(dir, "manifest.webmanifest")))
    .digest("hex").slice(0, 12)}`;
  const sw0 = readFileSync(join(dir, "sw.js"), "utf8");
  if (!VERSION_LINE.test(sw0) || !SHELL_LINE.test(sw0)) throw new Error("sw.js: VERSION or SHELL line not found");
  const sw = sw0
    .replace(VERSION_LINE, `const VERSION = "${version}"; // stamped by scripts/build.ts from the content of every shell file`)
    .replace(SHELL_LINE, `const SHELL = ["/", "/index.html", "/app.css", "/${file}", "/manifest.webmanifest"];`);
  return { file, integrity, version, html, sw };
}

/** Writes a stamped deploy into `dir`, removing superseded bundles (a deploy replaces the whole site). */
export function writeStamped(dir: string, js: string): Stamped {
  const s = stamp(dir, js);
  mkdirSync(join(dir, "assets"), { recursive: true });
  for (const f of readdirSync(join(dir, "assets"))) if (/^app\.[0-9a-f]+\.js$/.test(f) && `assets/${f}` !== s.file) unlinkSync(join(dir, "assets", f));
  if (existsSync(join(dir, "app.js"))) unlinkSync(join(dir, "app.js"));
  writeFileSync(join(dir, s.file), js);
  writeFileSync(join(dir, "index.html"), s.html);
  writeFileSync(join(dir, "sw.js"), s.sw);
  return s;
}

export async function bundle(): Promise<string> {
  const r = await build({ entryPoints: ["src/runtime/boot.ts"], bundle: true, format: "esm", target: "es2020", minify: true, write: false, charset: "utf8", legalComments: "none" });
  return r.outputFiles[0]!.text;
}

if (process.argv[1]?.endsWith("build.ts")) {
  const js = await bundle();
  if (process.argv.includes("--check")) {
    const s = stamp("public", js);
    const problems = [
      !existsSync(join("public", s.file)) && `missing ${s.file}`,
      existsSync(join("public", s.file)) && readFileSync(join("public", s.file), "utf8") !== js && `${s.file} differs from the current sources`,
      readFileSync("public/index.html", "utf8") !== s.html && "public/index.html is not stamped for the current bundle",
      readFileSync("public/sw.js", "utf8") !== s.sw && "public/sw.js VERSION/SHELL is stale",
    ].filter(Boolean);
    if (problems.length) { for (const p of problems) console.error(`✖ ${p}`); console.error("Run: npm run build"); process.exit(1); }
    console.log(`✔ public/ is stamped for the current sources (${s.file}, ${s.version})`);
  } else {
    const s = writeStamped("public", js);
    console.log(`✔ public/${s.file} ${(js.length / 1024).toFixed(1)} KB · ${s.integrity.slice(0, 22)}… · sw ${s.version}`);
  }
}

/** Bundles src/demo/demo.ts and inlines it into demo/template.html → dist/simulator.html (single self-contained file).
 *  --check: exit 1 if dist/simulator.html is not what the current sources produce. */
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
const r = await build({ entryPoints: ["src/demo/demo.ts"], bundle: true, format: "iife", target: "es2020", minify: true, write: false });
const js = r.outputFiles[0]!.text.replace(/<\/script/gi, "<\\/script");
const html = readFileSync("demo/template.html", "utf8").replace("/*__BUNDLE__*/", () => js);
if (process.argv.includes("--check")) {
  if (!existsSync("dist/simulator.html") || readFileSync("dist/simulator.html", "utf8") !== html) {
    console.error("✖ dist/simulator.html is stale. Run: npm run build");
    process.exit(1);
  }
  console.log("✔ dist/simulator.html is up to date");
} else {
  mkdirSync("dist", { recursive: true });
  writeFileSync("dist/simulator.html", html);
  console.log(`✔ dist/simulator.html (${(js.length / 1024).toFixed(0)} KB of engine inlined)`);
}

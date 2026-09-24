/** Bundles src/demo/demo.ts and inlines it into demo/template.html → dist/simulator.html (single self-contained file). */
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const r = await build({ entryPoints: ["src/demo/demo.ts"], bundle: true, format: "iife", target: "es2020", minify: true, write: false });
const js = r.outputFiles[0]!.text.replace(/<\/script/gi, "<\\/script");
mkdirSync("dist", { recursive: true });
writeFileSync("dist/simulator.html", readFileSync("demo/template.html", "utf8").replace("/*__BUNDLE__*/", () => js));
console.log(`✔ dist/simulator.html (${(js.length / 1024).toFixed(0)} KB of engine inlined)`);

/**
 * BUILD LAB — writes the beta lab into app/lab/ (served at /app/lab/):
 *   index.html      hub for testers and clinicians (release-gate status from `registry:lint --release`)
 *   revisao.html    clinical review sheet generated from registry + pt-BR.json (every rule, question and text)
 *   roteiros.html   tester missions: golden scenarios replayed through the real engine
 *   simulador.html  dist/simulator.html (the engineering simulator with the "why" panel)
 *   cenarios.json   golden scenarios as journals, for the Modo Médico lab mode (../medico.html?cenario=…)
 * Run after `scripts/build.ts` and `scripts/build-demo.ts` (npm run build does all three).
 *
 *   npx tsx scripts/build-lab.ts            write
 *   npx tsx scripts/build-lab.ts --check    exit 1 if app/lab/ is stale
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { SITE } from "./build";
import { labFacts, missions, offlineMission, reviewSections, medicoScenarios } from "./lab/model";
import { hubPage, missionsPage, reviewPage } from "./lab/pages";

export const LAB = join(SITE, "lab");

/** The bundle the shell currently points at (the lab shows it so feedback can be traced to an exact build). */
export function currentBundle(): string {
  const m = /<script type="module" src="\.\/(assets\/app\.[0-9a-f]+\.js)"/.exec(readFileSync(join(SITE, "index.html"), "utf8"));
  if (!m) throw new Error("app/index.html: stamped bundle not found; run scripts/build.ts first");
  return m[1]!;
}

export function labFiles(): Record<string, string> {
  const facts = labFacts(currentBundle());
  const ms = [...missions(), offlineMission()];
  const sections = reviewSections();
  const nReview = sections.reduce((n, s) => n + s.items.length, 0);
  const sim = readFileSync("dist/simulator.html", "utf8");
  const CHARSET = '<meta charset="utf-8">';
  if (!sim.startsWith(CHARSET)) throw new Error("dist/simulator.html: expected to start with the charset meta");
  return {
    "index.html": hubPage(facts, ms.length, nReview),
    "revisao.html": reviewPage(facts, sections),
    "roteiros.html": missionsPage(facts, ms),
    // Modo Médico lab mode (app/medico.html?cenario=…): golden scenarios replayed into the journal the app writes.
    "cenarios.json": `${JSON.stringify(medicoScenarios())}\n`,
    // The lab promises no third-party request: the copy drops the simulator's web fonts (system fonts take over).
    "simulador.html": sim.replace(CHARSET, `${CHARSET}\n<meta name="robots" content="noindex, nofollow">`).replace(/^<link[^>]+https:\/\/fonts\.[^>]*>\r?\n/gm, ""),
  };
}

if (process.argv[1]?.endsWith("build-lab.ts")) {
  const files = labFiles();
  if (process.argv.includes("--check")) {
    const extra = existsSync(LAB) ? readdirSync(LAB).filter((f) => !(f in files)) : [];
    const problems = [
      ...Object.entries(files).filter(([f, c]) => !existsSync(join(LAB, f)) || readFileSync(join(LAB, f), "utf8") !== c).map(([f]) => `app/lab/${f} is stale`),
      ...extra.map((f) => `app/lab/${f} is not produced by the build`),
    ];
    if (problems.length) { for (const p of problems) console.error(`✖ ${p}`); console.error("Run: npm run build"); process.exit(1); }
    console.log(`✔ app/lab/ is up to date (${Object.keys(files).join(", ")})`);
  } else {
    mkdirSync(LAB, { recursive: true });
    for (const [f, c] of Object.entries(files)) writeFileSync(join(LAB, f), c);
    console.log(`✔ app/lab/ ${Object.entries(files).map(([f, c]) => `${f} ${(c.length / 1024).toFixed(0)} KB`).join(" · ")}`);
  }
}

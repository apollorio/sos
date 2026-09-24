/**
 * INV-016 — the core is pure. It may not import the runtime/UI and may not touch
 * the clock, the network, storage, randomness or the DOM. Enforced on the source text.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : [];
  });

const FORBIDDEN: [RegExp, string][] = [
  [/from\s+["'][./]*\/(runtime|ui)\//, "imports runtime/ui"],
  [/\bDate\.now\s*\(/, "reads the clock"],
  [/\bnew Date\s*\(/, "reads the clock"],
  [/\bperformance\.now\s*\(/, "reads the clock"],
  [/\bMath\.random\s*\(/, "uses randomness"],
  [/\bfetch\s*\(/, "does network I/O"],
  [/\bXMLHttpRequest\b|\bWebSocket\b|\bnavigator\./, "touches the platform"],
  [/\b(window|document|localStorage|sessionStorage|indexedDB)\b/, "touches the DOM/storage"],
  [/\bsetTimeout\b|\bsetInterval\b/, "owns timers"],
];

describe("architecture: src/core is pure (INV-016)", () => {
  for (const file of walk("src/core")) {
    it(file, () => {
      const src = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      const hits = FORBIDDEN.filter(([re]) => re.test(src)).map(([, why]) => why);
      expect(hits).toEqual([]);
    });
  }
});

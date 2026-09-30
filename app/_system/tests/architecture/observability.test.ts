/** INV-025 / L17 — the runtime never logs state, journal payloads or summaries; only opsLog may print. */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { opsLog } from "../../src/runtime/observability";

const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : []; });

describe("observability firewall (INV-025)", () => {
  for (const file of walk("src/runtime").filter((f) => !f.endsWith("observability.ts"))) {
    it(`${file} does not console.log/info/debug (only console.error for fail-to-shell)`, () => {
      const src = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(/console\.(log|info|debug|table|dir)\s*\(/.test(src)).toBe(false);
    });
  }
  it("opsLog drops forbidden and unknown fields", () => {
    const calls: unknown[] = [];
    const orig = console.info;
    console.info = (...a: unknown[]) => { calls.push(a); };
    try { opsLog("info", "sync", { flushed: 3, signals: "x", payload: "y", text: "quero morrer", band: "P1", weird: 1 }); }
    finally { console.info = orig; }
    expect(calls[0]).toEqual(["[sos] sync", { flushed: 3, band: "P1" }]);
  });
});

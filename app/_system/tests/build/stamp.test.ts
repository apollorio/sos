/** Deployment integrity — the committed app shell (app/, served at /app/) points at a bundle that exists and matches its SRI hash. */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { stamp, releaseChannel, SITE } from "../../scripts/build";
import { lintRegistry } from "../../scripts/registry-lint";

const at = (f: string) => join(SITE, f);

describe("app/ is a consistent, content-addressed deploy", () => {
  const html = readFileSync(at("index.html"), "utf8");
  const sw = readFileSync(at("sw.js"), "utf8");
  const m = /<script type="module" src="\.\/(assets\/app\.([0-9a-f]{12})\.js)" integrity="(sha384-[A-Za-z0-9+/=]+)"><\/script>/.exec(html);

  it("index.html loads a hashed bundle by a relative path with Subresource Integrity, and the bytes match", () => {
    expect(m).not.toBeNull();
    const [, file, hash, integrity] = m!;
    expect(existsSync(at(file!))).toBe(true);
    const js = readFileSync(at(file!));
    expect(createHash("sha256").update(js).digest("hex").slice(0, 12)).toBe(hash);
    expect(`sha384-${createHash("sha384").update(js).digest("base64")}`).toBe(integrity);
    expect(readdirSync(at("assets")).filter((f) => /^app\..*\.js$/.test(f))).toEqual([file!.slice("assets/".length)]);
  });

  it("local.html (audit 014) is the same shell for file://: one classic hashed bundle, no module, no SRI, never precached", () => {
    const local = readFileSync(at("local.html"), "utf8");
    const l = /<script defer src="\.\/(assets\/local\.([0-9a-f]{12})\.js)"><\/script>/.exec(local);
    expect(l).not.toBeNull();
    const js = readFileSync(at(l![1]!));
    expect(createHash("sha256").update(js).digest("hex").slice(0, 12)).toBe(l![2]);
    expect(readdirSync(at("assets")).filter((f) => /^local\..*\.js$/.test(f))).toEqual([l![1]!.slice("assets/".length)]);
    expect(local).not.toMatch(/type="module"|integrity=/);
    expect(local).toContain('href="tel:192"');
    // Same shell otherwise (192 bar, static help, CSP, beta notice): only the script tag and the lab link differ.
    const shellOf = (h: string) => h.replace(/<!--[^]*?-->/g, "").replace(/<script[^>]*><\/script>/g, "").replace(/\.\/lab\/index\.html/g, "./lab/").replace(/\s+/g, " ");
    expect(shellOf(local)).toBe(shellOf(html));
    expect(sw).not.toContain("local.");
  });

  it("every shell reference is relative, so the same files work at /app/ and on any preview host", () => {
    expect(html).not.toMatch(/(href|src)="\/(?!\/)/);
    expect(html).toContain('href="./manifest.webmanifest"');
    expect(html).toContain('href="./app.css"');
    const manifest = JSON.parse(readFileSync(at("manifest.webmanifest"), "utf8")) as Record<string, string>;
    expect([manifest["start_url"], manifest["scope"]]).toEqual(["./", "./"]);
    expect(readFileSync("src/runtime/boot.ts", "utf8")).toContain('register("./sw.js")');
  });

  it("sw.js precaches exactly that bundle and its VERSION is derived from the shell's content", () => {
    const js = readFileSync(at(m![1]!), "utf8");
    const s = stamp(SITE, js, releaseChannel());
    expect(sw).toBe(s.sw);
    expect(html).toBe(s.html);
    expect(sw).toContain(`"./${m![1]}"`);
    expect(sw).toContain('cache: "reload"');
  });

  it("the beta notice follows the clinical release gate (CLAUDE.md rule 8)", () => {
    const gateRed = lintRegistry({ release: true }).errors.length > 0;
    expect(releaseChannel()).toBe(gateRed ? "beta" : "release");
    expect(html).toContain(`<html lang="pt-BR" data-channel="${gateRed ? "beta" : "release"}">`);
    expect(readFileSync(at("app.css"), "utf8")).toContain('html[data-channel="release"] .channel { display:none; }');
  });

  it("the shell carries a strict CSP of its own (host-independent) with no inline script or style", () => {
    const csp = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(html)?.[1] ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).not.toContain("unsafe-inline");
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);
    expect(html).not.toMatch(/<style|style="/);
  });

  it("/_headers: only content-addressed files are immutable; everything pointing at them revalidates", () => {
    const h = readFileSync("../../_headers", "utf8");
    const blocks = Object.fromEntries(h.split(/\n(?=\S)/).filter((b) => !b.startsWith("#")).map((b) => [b.split("\n")[0]!.trim(), b]));
    expect(blocks["/app/assets/*"]).toMatch(/immutable/);
    for (const path of ["/app/", "/app/index.html", "/app/sw.js"]) expect(blocks[path], path).toMatch(/Cache-Control: no-cache/);
    expect(Object.entries(blocks).filter(([k, v]) => k !== "/app/assets/*" && /immutable/.test(v))).toEqual([]);
    for (const path of ["/app/", "/app/index.html"]) expect(blocks[path], path).toMatch(/Content-Security-Policy: default-src 'self'/);
    expect(blocks["/*"]).toMatch(/Permissions-Policy: geolocation=\(\), camera=\(\), microphone=\(\)/);
    expect(blocks["/app/lab/*"]).toMatch(/X-Robots-Tag: noindex/);
  });
});

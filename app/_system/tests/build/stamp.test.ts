/** Deployment integrity — the committed static shell points at a bundle that exists and matches its SRI hash. */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { stamp } from "../../scripts/build";

describe("public/ is a consistent, content-addressed deploy", () => {
  const html = readFileSync("public/index.html", "utf8");
  const sw = readFileSync("public/sw.js", "utf8");
  const m = /<script type="module" src="\/(assets\/app\.([0-9a-f]{12})\.js)" integrity="(sha384-[A-Za-z0-9+/=]+)"><\/script>/.exec(html);

  it("index.html loads a hashed bundle with Subresource Integrity, and the bytes match", () => {
    expect(m).not.toBeNull();
    const [, file, hash, integrity] = m!;
    expect(existsSync(`public/${file}`)).toBe(true);
    const js = readFileSync(`public/${file}`);
    expect(createHash("sha256").update(js).digest("hex").slice(0, 12)).toBe(hash);
    expect(`sha384-${createHash("sha384").update(js).digest("base64")}`).toBe(integrity);
    expect(existsSync("public/app.js")).toBe(false);
    expect(readdirSync("public/assets").filter((f) => f.endsWith(".js"))).toEqual([file!.slice("assets/".length)]);
  });

  it("sw.js precaches exactly that bundle and its VERSION is derived from the shell's content", () => {
    const js = readFileSync(`public/${m![1]}`, "utf8");
    const s = stamp("public", js);
    expect(sw).toBe(s.sw);
    expect(html).toBe(s.html);
    expect(sw).toContain(`"/${m![1]}"`);
    expect(sw).toContain('cache: "reload"');
  });

  it("_headers: only content-addressed files are immutable; everything pointing at them revalidates", () => {
    const h = readFileSync("public/_headers", "utf8");
    const blocks = Object.fromEntries(h.split(/\n(?=\S)/).filter((b) => !b.startsWith("#")).map((b) => [b.split("\n")[0]!.trim(), b]));
    expect(blocks["/assets/*"]).toMatch(/immutable/);
    for (const path of ["/", "/index.html", "/sw.js"]) expect(blocks[path], path).toMatch(/Cache-Control: no-cache/);
    expect(Object.entries(blocks).filter(([k, v]) => k !== "/assets/*" && /immutable/.test(v))).toEqual([]);
    expect(blocks["/*"]).toMatch(/Permissions-Policy: geolocation=\(\), camera=\(\), microphone=\(\)/);
  });
});

/** Tiny static server for the browser tests: serves a folder like a static host (directory → index.html). */
import { createServer, type Server } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

/** The repository root: the deployed site (/ = gateway, /app/ = SOS, /app/lab/ = beta lab). */
export const REPO_ROOT = resolve("../..");
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml",
};

export function serve(root: string, port: number, headers: Record<string, string> = {}): Server {
  return createServer((req, res) => {
    let p = join(root, decodeURIComponent(req.url!.split("?")[0]!));
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
    if (!p.startsWith(root) || !existsSync(p)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": TYPES[extname(p)] ?? "application/octet-stream", ...headers }).end(readFileSync(p));
  }).listen(port);
}

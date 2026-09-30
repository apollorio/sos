/* Offline-first: the shell and the engine are precached, so help works with zero network (L11).
   Paths are relative to this file: the app lives at /app/ and this worker's scope is /app/. */
const VERSION = "sos-cacf73d9e247"; // stamped by scripts/build.ts from the content of every shell file
const SHELL = ["./", "./index.html", "./app.css", "./assets/app.703f01299340.js", "./manifest.webmanifest"];
// cache: "reload" — a new deploy is fetched from the network, never from a stale HTTP cache.
self.addEventListener("install", (e) => e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).catch(() => caches.match(new URL("./index.html", location.href).href))));
});

/* Offline-first: the shell and the engine are precached, so help works with zero network (L11). */
const VERSION = "sos-506859f20858"; // stamped by scripts/build.ts from the content of every shell file
const SHELL = ["/", "/index.html", "/app.css", "/assets/app.2547502e2185.js", "/manifest.webmanifest"];
// cache: "reload" — a new deploy is fetched from the network, never from a stale HTTP cache.
self.addEventListener("install", (e) => e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).catch(() => caches.match("/index.html"))));
});

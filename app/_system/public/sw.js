/* Offline-first: the shell and the engine are precached, so help works with zero network (L11). */
const VERSION = "sos-apollo-v0.1.0"; // bumped by the build (hash of app.js + registry)
const SHELL = ["/", "/index.html", "/app.css", "/app.js", "/manifest.webmanifest"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).catch(() => caches.match("/index.html"))));
});

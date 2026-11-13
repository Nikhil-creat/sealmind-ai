// Offline shell + cached film: repeat visits skip the 11 MB video download. API calls are never cached.
const V = "sm-v3", VIDEO = "https://d2ol7oe51mr4n9.cloudfront.net";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.pathname.startsWith("/api/") || u.pathname.startsWith("/_vercel/")) return;
  if (e.request.url.startsWith(VIDEO)) {
    e.respondWith(caches.open(V).then(async (c) => { const hit = await c.match(e.request); if (hit) return hit; const r = await fetch(e.request); if (r.ok && r.status === 200) c.put(e.request, r.clone()); return r; }));
    return;
  }
  if (u.origin === location.origin) e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); if (r.ok) caches.open(V).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});

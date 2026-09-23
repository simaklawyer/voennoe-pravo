/* Service worker vp-v9 */
const CACHE = "vp-v9";
const PRECACHE = ["./","./index.html","./css/styles.css","./css/v8.css","./css/pwa.css","./js/app.js","./js/pwa.js","./manifest.webmanifest","./favicon.svg","./icon-192.svg","./icon-512.svg"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const networkFirst = req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith(".js") || url.pathname.endsWith(".json") || url.pathname.endsWith("/") || url.pathname.endsWith(".webmanifest") || url.pathname.endsWith(".css");
  if (networkFirst) {
    event.respondWith(fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; }).catch(() => caches.match(req).then((c) => c || caches.match("./index.html"))));
    return;
  }
  event.respondWith(caches.match(req).then((cached) => cached || fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })));
});

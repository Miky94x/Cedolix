const V = "cedolix-1.12.5",
  LOCAL = [
    "./",
    "index.html",
    "style.css",
    "app.js",
    "manifest.webmanifest",
    "icon-192.png",
    "icon-512.png",
    "apple-touch-icon.png",
  ],
  OPT = ["icon-maskable-512.png"],
  CDN = [
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
  ];
// chiave di cache senza query (?v=...): una sola copia per file
const key = (u) => u.origin + u.pathname;
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(V)
      .then(async (c) => {
        await c.addAll(LOCAL);
        await Promise.all(OPT.concat(CDN).map((u) => c.add(u).catch(() => {})));
      })
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((k) =>
        Promise.all(k.filter((n) => n !== V).map((n) => caches.delete(n))),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    // rete prima (max 3 secondi), poi cache
    const fb = () =>
        caches
          .match(key(u))
          .then(
            (m) =>
              m || (r.mode === "navigate" ? caches.match("index.html") : null),
          ),
      net = fetch(r).then((res) => {
        if (res.ok) {
          const cp = res.clone();
          caches.open(V).then((c) => c.put(key(u), cp));
        }
        return res;
      }),
      to = new Promise((ok) => setTimeout(() => ok(null), 3000));
    e.waitUntil(net.catch(() => {}));
    e.respondWith(
      Promise.race([net, to])
        .then((res) => res || fb().then((m) => m || net))
        .catch(() => fb().then((m) => m || Response.error())),
    );
  } else {
    e.respondWith(
      caches.match(r).then(
        (m) =>
          m ||
          fetch(r).then((res) => {
            if (res.ok) {
              const cp = res.clone();
              caches.open(V).then((c) => c.put(r, cp));
            }
            return res;
          }),
      ),
    );
  }
});

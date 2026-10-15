const V = "ore-lavoro-v1",
  LOCAL = ["./", "index.html", "style.css", "app.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"],
  CDN = [
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
  ];
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(V).then(async (c) => {
      await c.addAll(LOCAL);
      await Promise.all(CDN.map((u) => c.add(u).catch(() => {})));
    }).then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((k) => Promise.all(k.filter((n) => n !== V).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    // rete prima (le versioni ?v=... cambiano a ogni apertura), cache se offline
    e.respondWith(
      fetch(r)
        .then((res) => {
          if (res.ok) {
            const cp = res.clone();
            caches.open(V).then((c) => c.put(r, cp));
          }
          return res;
        })
        .catch(() =>
          caches.match(r, { ignoreSearch: true }).then((m) => m || (r.mode === "navigate" ? caches.match("index.html") : Response.error())),
        ),
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

/* RavenShield service worker — offline support (network-first for pages, cache-first for assets) */
const CACHE = "ravenshield-v16";
const CORE = [
  "./", "index.html", "dashboard.html", "vault.html", "rag.html", "shield.html", "honeypot.html", "audit.html", "agent.html",
  "secrets.html", "password.html", "phishing.html", "integrity.html", "docs.html", "about.html", "signin.html", "404.html", "assets/js/pages/signin.js?v=16",
  "assets/css/main.css?v=17", "assets/js/core.js?v=16", "assets/js/lib/shield-engine.js?v=16",
  "assets/js/pages/home.js?v=16", "assets/js/pages/vault.js?v=16", "assets/js/pages/rag.js?v=16", "assets/js/pages/shield.js?v=16", "assets/js/pages/honeypot.js?v=16",
  "assets/js/pages/audit.js?v=16", "assets/js/pages/agent.js?v=16", "assets/js/pages/secrets.js?v=16", "assets/js/pages/password.js?v=16",
  "assets/js/pages/phishing.js?v=16", "assets/js/pages/integrity.js?v=16", "assets/js/pages/dashboard.js?v=16", "assets/js/pages/docs.js?v=16",
  "assets/img/raven-shield.png?v=16", "assets/img/raven-base.png?v=6", "assets/img/raven-head.png?v=6", "assets/img/favicon.png", "assets/img/icon-192.png", "assets/img/icon-512.png", "manifest.webmanifest", "assets/vendor/three.min.js", "assets/js/raven3d.js?v=16",
  "assets/img/features/vault.svg", "assets/img/features/rag.svg", "assets/img/features/shield.svg", "assets/img/features/honeypot.svg", "assets/img/features/audit.svg", "assets/img/features/agent.svg", "assets/img/features/secrets.svg", "assets/img/features/password.svg", "assets/img/features/phishing.svg", "assets/img/features/integrity.svg", "assets/img/features/dashboard.svg", "assets/img/features/account.svg",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname === "api.pwnedpasswords.com") return; // never cache breach lookups
  const isPage = req.mode === "navigate";
  const sameOrFont = url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrFont) return;
  if (isPage) {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then((r) => r || caches.match("index.html"))));
  } else {
    // stale-while-revalidate: instant from cache, refreshed in the background
    e.respondWith(caches.open(CACHE).then((c) => c.match(req).then((hit) => {
      const net = fetch(req).then((res) => { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});

const CACHE = "qatar-dental-shell-v2";
const PUBLIC_FALLBACK = "/";
const PRIVATE_PREFIX = /^\/(?:account|clinic|admin|auth|api)(?:\/|$)/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(PUBLIC_FALLBACK, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // The service worker is only an offline shell fallback for public document
  // navigations. APIs, assets and authenticated/operator pages must always use
  // their real network/cache semantics and must never receive HTML as an API
  // fallback or persist sensitive page responses in this cache.
  if (request.method !== "GET" || url.origin !== self.location.origin || request.mode !== "navigate") return;
  if (PRIVATE_PREFIX.test(url.pathname)) return;

  event.respondWith(
    fetch(request).catch(async () => (await caches.match(PUBLIC_FALLBACK)) || Response.error()),
  );
});

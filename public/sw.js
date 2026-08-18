const CACHE = "qatar-dental-shell-v3";
const PUBLIC_FALLBACK = "/offline.html";
const PRIVATE_PREFIX = /^\/(?:account|clinic|admin|auth|api)(?:\/|$)/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(PUBLIC_FALLBACK, {
        cache: "reload",
      })))
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

  // Only public document navigations may receive the static offline shell.
  // APIs, assets and authenticated/operator pages always retain real network
  // semantics and are never replaced with cached HTML.
  if (request.method !== "GET" || url.origin !== self.location.origin || request.mode !== "navigate") return;
  if (PRIVATE_PREFIX.test(url.pathname)) return;

  event.respondWith(
    fetch(request).catch(async () => (await caches.match(PUBLIC_FALLBACK)) || Response.error()),
  );
});

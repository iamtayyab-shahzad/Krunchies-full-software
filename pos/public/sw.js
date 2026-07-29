/* Krunchies POS Service Worker — App Shell + static assets */
const CACHE_VERSION = "krunchies-pos-v6";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const PRODUCT_CACHE = `${CACHE_VERSION}-products`;
const RUNTIME_MAX_ENTRIES = 120;
const PRODUCT_MAX_ENTRIES = 200;

/** Critical routes only — rest warmed idle via WARM_SHELL. */
const PRECACHE_URLS = [
  "/",
  "/login",
  "/orders/new",
  "/orders/pending",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

/** Extra routes warmed after install (idle), not blocking first paint. */
const WARM_URLS = [
  "/orders/history",
  "/dashboard",
  "/products",
  "/categories",
  "/inventory",
  "/analytics",
  "/settings",
];

const APP_SHELL_FALLBACKS = [
  "/orders/new",
  "/orders/pending",
  "/",
  "/login",
  "/offline",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(url);
          } catch (err) {
            console.warn("[sw] precache failed", url, err);
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (k) =>
              k.startsWith("krunchies-pos-") && !k.startsWith(CACHE_VERSION),
          )
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "WARM_SHELL") {
    event.waitUntil(warmShellRoutes());
  }
});

async function warmShellRoutes() {
  const cache = await caches.open(SHELL_CACHE);
  const urls = [...PRECACHE_URLS, ...WARM_URLS];
  await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { credentials: "same-origin" });
        if (response.ok) await cache.put(url, response.clone());
      } catch {
        /* ignore — may already be offline */
      }
    }),
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never intercept cross-origin (API lives on another host)
  if (url.origin !== self.location.origin) return;

  // Never cache app API proxies or Next data routes
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/_next/data") ||
    request.headers.get("Authorization")
  ) {
    return;
  }

  // Product images — cache-first (immutable WebPs)
  if (url.pathname.startsWith("/products/")) {
    event.respondWith(cacheFirst(request, PRODUCT_CACHE, PRODUCT_MAX_ENTRIES));
    return;
  }

  // Next.js hashed static assets — cache-first with eviction
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE, RUNTIME_MAX_ENTRIES));
    return;
  }

  // Soft navigations (RSC) — network first; on fail let client hard-navigate
  // so our navigate handler can serve cached HTML shell.
  const isRsc =
    request.headers.get("RSC") === "1" ||
    request.headers.get("Next-Router-State-Tree") != null ||
    request.headers.get("Next-Router-Prefetch") != null;
  if (isRsc) {
    event.respondWith(fetch(request).catch(() => Response.error()));
    return;
  }

  // Navigations — network first, then cached app shell (never only /offline)
  if (request.mode === "navigate") {
    event.respondWith(navigationHandler(request));
    return;
  }

  // Icons / manifest / known app HTML routes
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".webmanifest") ||
    PRECACHE_URLS.includes(url.pathname) ||
    WARM_URLS.includes(url.pathname)
  ) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
  }
});

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const extra = keys.length - maxEntries;
  for (let i = 0; i < extra; i++) {
    await cache.delete(keys[i]);
  }
}

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      await trimCache(cacheName, maxEntries);
    }
    return response;
  } catch {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        cache.put(request, response.clone());
        await trimCache(cacheName, RUNTIME_MAX_ENTRIES);
      }
      return response;
    })
    .catch(() => cached);
  return cached || networkPromise;
}

async function matchShell(cache, request) {
  const url = new URL(request.url);
  const pathname = url.pathname === "" ? "/" : url.pathname;

  return (
    (await cache.match(request)) ||
    (await cache.match(pathname)) ||
    (await cache.match(new Request(pathname))) ||
    null
  );
}

async function navigationHandler(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      const url = new URL(request.url);
      const pathname = url.pathname === "" ? "/" : url.pathname;
      await cache.put(request, response.clone());
      await cache.put(pathname, response.clone());
      await trimCache(SHELL_CACHE, 40);
    }
    return response;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    let cached = await matchShell(cache, request);

    if (!cached) {
      for (const path of APP_SHELL_FALLBACKS) {
        cached =
          (await cache.match(path)) ||
          (await cache.match(new Request(path)));
        if (cached) break;
      }
    }

    if (!cached) {
      cached =
        (await caches.match("/offline")) ||
        (await caches.match(new Request("/offline")));
    }

    return (
      cached ||
      new Response(
        "<!doctype html><title>Offline</title><h1>Krunchies POS</h1><p>Open New Order from the home screen after connecting once.</p><p><a href='/orders/new'>New Order</a> · <a href='/orders/pending'>Pending</a></p>",
        {
          status: 503,
          headers: { "Content-Type": "text/html" },
        },
      )
    );
  }
}

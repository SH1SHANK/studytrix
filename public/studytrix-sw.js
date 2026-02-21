const url = new URL(self.location.href);
const version = url.searchParams.get("v") || "v3";
const SHELL_CACHE = `studytrix-shell-${version}`;
const STATIC_CACHE = `studytrix-static-${version}`;
const CACHE_PREFIXES = ["studytrix-shell-", "studytrix-static-"];
const NAV_TIMEOUT_MS = 3000;
const OFFLINE_FALLBACK_PATH = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      self.skipWaiting();
      const shell = await caches.open(SHELL_CACHE);
      await shell.addAll([OFFLINE_FALLBACK_PATH]);
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          const matchesPrefix = CACHE_PREFIXES.some((prefix) => key.startsWith(prefix));
          const isCurrent = key === SHELL_CACHE || key === STATIC_CACHE;
          if (matchesPrefix && !isCurrent) {
            return caches.delete(key);
          }
          return Promise.resolve(false);
        }),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isApiRequest(requestUrl) {
  return requestUrl.pathname.startsWith("/api/");
}

function isDevRuntimeRequest(requestUrl) {
  return (
    requestUrl.pathname.startsWith("/_next/webpack-hmr")
    || requestUrl.pathname.startsWith("/__nextjs")
    || requestUrl.pathname.startsWith("/__nextjs_original-stack-frames")
    || requestUrl.pathname.startsWith("/_next/static/chunks/webpack")
    || requestUrl.pathname.startsWith("/_next/static/development/")
  );
}

function isStaticAsset(requestUrl) {
  return (
    requestUrl.pathname.startsWith("/_next/static/")
    || requestUrl.pathname.startsWith("/icons/")
    || requestUrl.pathname.endsWith(".png")
    || requestUrl.pathname.endsWith(".jpg")
    || requestUrl.pathname.endsWith(".jpeg")
    || requestUrl.pathname.endsWith(".svg")
    || requestUrl.pathname.endsWith(".webp")
    || requestUrl.pathname.endsWith(".ico")
    || requestUrl.pathname.endsWith(".css")
    || requestUrl.pathname.endsWith(".js")
    || requestUrl.pathname.endsWith(".woff2")
    || requestUrl.pathname.endsWith(".woff")
    || requestUrl.pathname.endsWith(".ttf")
    || requestUrl.pathname === "/manifest.webmanifest"
  );
}

async function networkFirstNavigation(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, NAV_TIMEOUT_MS);

  try {
    const response = await fetch(request, { signal: controller.signal });
    if (response && response.ok) {
      const shell = await caches.open(SHELL_CACHE);
      shell.put(request, response.clone()).catch(() => undefined);
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const fallback = await caches.match(OFFLINE_FALLBACK_PATH);
    if (fallback) {
      return fallback;
    }

    return new Response("Offline", { status: 503, statusText: "Offline" });
  } finally {
    clearTimeout(timer);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone()).catch(() => undefined);
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const network = await fetchPromise;
  if (network) {
    return network;
  }

  return new Response("", { status: 504, statusText: "Gateway Timeout" });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (isDevRuntimeRequest(requestUrl)) {
    return;
  }

  if (isApiRequest(requestUrl)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAsset(requestUrl)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

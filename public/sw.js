// Service worker: cachea el shell de la app para que las páginas ya
// visitadas sigan cargando sin conexión. Los datos en sí viven en Dexie
// (IndexedDB), no aquí — este SW solo asegura que el HTML/JS arranque.
//
// Solo se cachean navegaciones de documento completo (mode: "navigate") y
// assets estáticos. Las peticiones RSC de las transiciones cliente de
// Next.js (mismo pathname, distinto formato de cuerpo) se dejan pasar sin
// interceptar: cachearlas bajo la misma clave que la navegación completa
// serviría el payload RSC en bruto como si fuera el documento HTML.

const CACHE_VERSION = "ib-shell-v4";
const OFFLINE_URL = "/offline.html";

function cacheKeyFor(url) {
  const u = new URL(url);
  u.searchParams.delete("_rsc");
  return u.toString();
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll([OFFLINE_URL, "/manifest.json"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Llamadas a Supabase (o cualquier API externa) nunca se interceptan: si
  // fallan sin conexión, la capa de Dexie/outbox ya se encarga de eso.
  if (url.hostname.endsWith("supabase.co")) return;

  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    /\.(png|svg|ico|jpg|jpeg|webp)$/.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
  }

  // Cualquier otra petición GET (fetches RSC de transiciones cliente, etc.)
  // se deja pasar sin interceptar: si falla sin conexión, el navegador la
  // trata como un fetch normal fallido.
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_VERSION);
  const key = cacheKeyFor(request.url);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(key, response.clone());
    return response;
  } catch {
    const cached = await cache.match(key);
    if (cached) return cached;
    return cache.match(OFFLINE_URL);
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const key = cacheKeyFor(request.url);
  const cached = await cache.match(key);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(key, response.clone());
    return response;
  } catch {
    if (cached) return cached;
    throw new Error(`offline sin caché: ${key}`);
  }
}

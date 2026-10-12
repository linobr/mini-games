// One complete build per cache. Never cache external signalling or touch localStorage/IndexedDB.
const CACHE = 'mini-games-build-__BUILD_VERSION__';
const FILES = __PRECACHE_URLS__;
const BASE = new URL('./', self.location.href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(path => new URL(path, BASE).href))));
  // No skipWaiting: active games keep their current build until all their tabs close.
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('mini-games-build-') && k !== CACHE).map(k => caches.delete(k)))));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  let path = url.pathname.slice(BASE.pathname.length);
  if (!path || path.endsWith('/')) path += 'index.html';
  if (!FILES.includes(path)) return;
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(new URL(path, BASE).href)) || fetch(event.request)));
});

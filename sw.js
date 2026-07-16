/* Service Worker — Tareas (PWA offline-first) */
const CACHE = 'tareas-v12';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Nunca cachear las APIs de Google (auth y Drive)
  if (/googleapis\.com|accounts\.google\.com|gstatic\.com/.test(url.host)) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: url.origin === location.origin }).then(hit => {
      const net = fetch(e.request).then(r => {
        if (r.ok && (url.origin === location.origin || /cdnjs\.cloudflare\.com/.test(url.host))) {
          const cp = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, cp));
        }
        return r;
      }).catch(() => hit);
      return hit || net;
    })
  );
});

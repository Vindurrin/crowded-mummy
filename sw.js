// Network first, so edits show at once. Cache is the offline fallback.
const CACHE = 'life-os-v1';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './icon.svg',
  './src/main.js', './src/db.js', './src/model.js', './src/seed.js',
  './src/privacy.js', './src/backup.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

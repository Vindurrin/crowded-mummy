// Network first, so edits show at once. Cache is the offline fallback.
const CACHE = 'life-os-v2';
const SHELL = [
  './', './index.html', './style.css', './manifest.webmanifest', './icon.svg',
  './src/main.js', './src/state.js', './src/ui.js', './src/db.js', './src/model.js', './src/seed.js',
  './src/privacy.js', './src/backup.js', './src/dates.js', './src/xp.js', './src/training.js',
  './src/nutrition.js', './src/path.js', './src/jobs.js', './src/week.js', './src/admin.js',
  './src/screens/today.js', './src/screens/train.js', './src/screens/meals.js', './src/screens/path.js',
  './src/screens/jobs.js', './src/screens/admin.js', './src/screens/week.js', './src/screens/setup.js',
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

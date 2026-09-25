// Service Worker for পরীক্ষার খাতা PWA
// v2: HTML pages are now NETWORK-FIRST, so a new version pushed to GitHub shows up right away
// (v1 was cache-first and kept showing the old app until the 2nd reload).
// Bump CACHE_NAME (v3, v4...) whenever you change sw.js / icons to force a clean cache.
// v3: index.html now loads its JS from separate files under js/ (split for maintainability),
// so those files are precached too. Bump this version any time index.html, sw.js, the icons,
// or any file under js/ changes, so returning visitors get the update instead of a stale cache.
const CACHE_NAME = 'tuition-app-v4';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './core.js',
  './doubt.js',
  './exams.js',
  './topics.js',
  './attendance.js',
  './faq.js',
  './notes.js',
  './mastery.js',
  './coupon.js',
  './shop.js',
  './writtencq.js',
  './auth.js',
  './withdrawals.js',
  './render.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // add one by one so a single missing file can't cancel the whole precache
      Promise.all(PRECACHE_ASSETS.map(url => cache.add(url).catch(err => console.warn('Precache skipped:', url, err))))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Never touch API / backend calls (Google Apps Script) or non-GET requests
  if (req.method !== 'GET' || url.hostname.includes('script.google.com') || url.searchParams.has('action')) {
    return;
  }

  // Page loads: network first, fall back to the cached app when offline
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put('./index.html', copy));
        }
        return res;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Everything else (icons, fonts, KaTeX...): serve from cache fast, refresh in background
  event.respondWith(
    caches.match(req).then(cached => {
      const refresh = fetch(req).then(res => {
        if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || refresh;
    })
  );
});

// Cardyssey's offline helper (a "service worker"). It keeps a copy of Cardyssey's own files in this
// browser, so the app opens and works without internet once it has been visited. It never touches
// adventures (those live in the browser's storage) and never sends anything anywhere.
//
// While online, every file comes fresh from the website and the copy is updated; the copy is only
// used when the internet is gone. tools/publish.js fills in VERSION and FILES for each release, so
// installing it also copies every file up front, not just the ones already opened.
const VERSION = 'mvx22bff';
const FILES = ["app-icon-192.png","app-icon-512.png","app-icon.svg","brand.css?v=mvx22bff","demo.js?v=mvx22bff","examples.js?v=mvx22bff","favicon.svg","icons.js?v=mvx22bff","main.js?v=mvx22bff","manifest.webmanifest","map.js?v=mvx22bff","model.js?v=mvx22bff","octopus-mark.svg","paint.js?v=mvx22bff","play.js?v=mvx22bff","sounds.js?v=mvx22bff","stamps.js?v=mvx22bff","store.js?v=mvx22bff","style.css?v=mvx22bff","tentacle-corner.svg","tour.js?v=mvx22bff"];
const CACHE = `cardyssey-${VERSION}`;
const FONTS = 'cardyssey-fonts'; // the brand fonts, from Google Fonts

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', ...FILES])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('cardyssey-') && key !== CACHE && key !== FONTS) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fonts never change, so a saved copy is used first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(caches.open(FONTS).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }

  // Cardyssey's own files: fresh from the website when online, the saved copy when offline
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return;
  event.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await c.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' && await c.match('./'));
      if (hit) return hit;
      throw err;
    }
  })());
});

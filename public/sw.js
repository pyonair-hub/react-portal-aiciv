// Pyonair PWA service worker.
// Goal: the INSTALLED home-screen app must always show the LATEST portal —
// never a stale shell. The old SW precached '/' and '/index.html' under a fixed
// cache name, so the installed app could keep serving an old HTML shell (Jord:
// "the app has old stuff after install"). This version:
//   1. Bumps the cache name (date-versioned) so old caches are purged on update.
//   2. Does NOT precache the HTML shell — navigations are ALWAYS network-first,
//      so the app loads the freshest index.html (which points at the current,
//      no-cache JS/CSS bundle).
//   3. skipWaiting() + clients.claim() so a new SW takes control immediately,
//      no "close all tabs to update" limbo.
const CACHE_NAME = 'pyonair-2026-06-18'

self.addEventListener('install', (event) => {
  // Activate the new SW the moment it's installed — don't wait for old tabs.
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  // Navigations (the HTML document) + the JS/CSS bundle: ALWAYS network-first so
  // the installed app gets the latest build. Fall back to cache only when
  // offline. We cache successful responses just for offline resilience — but
  // network always wins when online, so it never goes stale.
  event.respondWith(
    fetch(req)
      .then((res) => {
        // Only cache same-origin, OK GET responses (skip the deepgram WS, APIs).
        if (res && res.ok && new URL(req.url).origin === self.location.origin) {
          const copy = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {})
        }
        return res
      })
      .catch(() => caches.match(req))
  )
})

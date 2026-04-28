// FreshTrack Service Worker — makes the app installable as a PWA
const CACHE = 'freshtrack-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => self.clients.claim())

// Network-first: always fetch fresh content, fall back to cache only if offline
self.addEventListener('fetch', event => {
  // Skip non-GET and cross-origin requests (Supabase, fonts, etc.)
  if (event.request.method !== 'GET') return
  if (!event.request.url.startsWith(self.location.origin)) return

  event.respondWith(
    fetch(event.request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(event.request, clone))
        return res
      })
      .catch(() => caches.match(event.request))
  )
})

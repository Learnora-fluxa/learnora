const CACHE = 'learnora-v1'
const PRECACHE = ['/', '/index.html']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  // Never intercept non-GET or Supabase API calls
  if (request.method !== 'GET') return
  if (url.hostname.includes('supabase.co')) return

  // Cache-first for versioned static assets (hashed filenames)
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(request).then(hit => {
          if (hit) return hit
          return fetch(request).then(res => { cache.put(request, res.clone()); return res })
        })
      )
    )
    return
  }

  // Network-first for HTML navigation — fall back to cached shell when offline
  e.respondWith(
    fetch(request)
      .then(res => {
        caches.open(CACHE).then(c => c.put(request, res.clone()))
        return res
      })
      .catch(() =>
        caches.match(request).then(hit => hit || caches.match('/'))
      )
  )
})

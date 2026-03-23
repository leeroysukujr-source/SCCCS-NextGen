const CACHE_NAME = 'scccs-cache-v1'
const ASSETS = [
  '/',
  '/index.html',
  '/assets/index-rbrmJdKK.js',
  '/assets/index-CNd3Sp1b.css'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((resp) => {
        if (!resp || resp.status !== 200 || resp.type !== 'basic') return resp
        const cloned = resp.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned))
        return resp
      }).catch(() => caches.match('/'))
    })
  )
})

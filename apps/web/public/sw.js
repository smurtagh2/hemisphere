const CACHE_NAME = 'hemisphere-v1';
const STATIC_ASSETS = ['/', '/dashboard'];
const API_ORIGIN = '/api';

// Install: pre-cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests for caching
  if (request.method !== 'GET') return;

  if (url.pathname.startsWith(API_ORIGIN)) {
    // Network-first strategy for API calls
    event.respondWith(networkFirstWithCache(request));
  } else {
    // Cache-first strategy for static assets (JS, CSS, images, fonts)
    event.respondWith(cacheFirstWithNetwork(request));
  }
});

/**
 * Network-first: try network, fall back to cache on failure.
 * Useful for API responses where freshness matters.
 */
async function networkFirstWithCache(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const networkResponse = await fetch(request);
    // Cache successful responses for offline fallback
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline', message: 'No cached response available' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Cache-first: serve from cache, fall back to network and update cache.
 * Useful for static assets that rarely change.
 */
async function cacheFirstWithNetwork(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// Background Sync: replay pending review submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-reviews') {
    event.waitUntil(syncPendingReviews());
  }
});

/**
 * Replay any pending review submissions stored in IndexedDB outbox.
 * Opens the outbox store, iterates pending items, posts them to the API,
 * and removes successfully synced records.
 */
async function syncPendingReviews() {
  const dbRequest = indexedDB.open('hemisphere-offline', 1);

  const db = await new Promise((resolve, reject) => {
    dbRequest.onsuccess = () => resolve(dbRequest.result);
    dbRequest.onerror = () => reject(dbRequest.error);
  });

  const tx = db.transaction('outbox', 'readwrite');
  const store = tx.objectStore('outbox');

  const allRecords = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  for (const record of allRecords) {
    try {
      const response = await fetch('/api/review/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: record.sessionId,
          itemId: record.itemId,
          rating: record.rating,
          timeMs: record.timeMs,
        }),
      });

      if (response.ok) {
        const deleteTx = db.transaction('outbox', 'readwrite');
        deleteTx.objectStore('outbox').delete(record.id);
        await new Promise((resolve, reject) => {
          deleteTx.oncomplete = resolve;
          deleteTx.onerror = () => reject(deleteTx.error);
        });
      }
    } catch {
      // Will retry on next sync event
    }
  }
}

/*
 * Creator webapp ka service worker.
 *
 * Jaan-bujh ke plain JS aur root (/sw.js) pe rakha hai:
 *  - root scope milta hai, isliye `Service-Worker-Allowed` header ki zarurat nahi
 *    (shared hosting pe Apache config change nahi karna padta)
 *  - koi build step / Workbox nahi — file jaisi hai waisi hi deploy hoti hai
 *
 * Strategy:
 *  - navigation (HTML): network-first, offline pe cached page ya offline note
 *  - /assets/* aur /pwa/*: cache-first (Vite ke hashed filenames — safe)
 *  - baaki sab (POST, checkout, API): kabhi cache nahi
 */

const VERSION = 'v1';
const SHELL_CACHE = `kiln-shell-${VERSION}`;
const ASSET_CACHE = `kiln-assets-${VERSION}`;
const OFFLINE_URL = '/pwa/offline.html';

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll([OFFLINE_URL, '/pwa/icon-192.png'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE).map((key) => caches.delete(key))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    // sirf apne origin ke GET — baaki browser khud handle kare
    if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // sirf webapp pages cache me rakho, dashboard/checkout nahi
                    if (response.ok && new URL(request.url).pathname.startsWith('/w/')) {
                        const copy = response.clone();
                        caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
                    }

                    return response;
                })
                .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))),
        );

        return;
    }

    const path = new URL(request.url).pathname;

    if (path.startsWith('/assets/') || path.startsWith('/pwa/')) {
        event.respondWith(
            caches.match(request).then(
                (cached) =>
                    cached ||
                    fetch(request).then((response) => {
                        if (response.ok) {
                            const copy = response.clone();
                            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
                        }

                        return response;
                    }),
            ),
        );
    }
});

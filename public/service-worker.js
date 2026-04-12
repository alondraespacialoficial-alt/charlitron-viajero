/**
 * Service Worker para Charlitron® Viajero del Tiempo
 * Permite que la app se descargue y funcione offline
 */

const CACHE_NAME = 'charlitron-v2';
const IMAGE_CACHE_NAME = 'charlitron-images-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
  '/opensearch.xml',
  '/images/charlitron-logo.svg'
];

/**
 * Instala el Service Worker y cachea assets
 */
self.addEventListener('install', event => {
  console.log('📦 Service Worker: Instalando cache...', CACHE_NAME);
  
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Cache abierto:', CACHE_NAME);
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch(error => {
        console.error('❌ Error al cachear assets:', error);
      })
  );
  
  self.skipWaiting();
});

/**
 * Activa el Service Worker y limpia caches antiguos
 */
self.addEventListener('activate', event => {
  console.log('🔄 Service Worker: Activando...');
  
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== IMAGE_CACHE_NAME) {
              console.log('🗑️  Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
  );
  
  self.clients.claim();
});

/**
 * Maneja las peticiones (fetch strategy)
 * - Imágenes externas: cache first → si no está en cache, intenta red y guarda si es OK
 * - Resto: network first, fallback a cache
 */
self.addEventListener('fetch', event => {
  // Ignorar peticiones que no sean GET
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(url.pathname);
  const isExternalImage = isImage && url.hostname !== self.location.hostname;

  // Cache-first para imágenes externas (evita 429 repetidos en image2url.com)
  if (isExternalImage) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => {
            // Si la red falla y no hay cache, retornar respuesta vacía
            return new Response('', { status: 503 });
          });
        })
      )
    );
    return;
  }

  // Network first strategy para el resto
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // No cachear si no es OK
        if (!response || response.status !== 200) {
          return response;
        }

        // Clonar la respuesta
        const responseClone = response.clone();

        // Cachear la respuesta
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });

        return response;
      })
      .catch(() => {
        // Si la red falla, retornar del cache
        return caches
          .match(event.request)
          .then(response => {
            if (response) {
              return response;
            }
            // Si no está en cache, retornar offline page
            return caches.match('/index.html');
          });
      })
  );
});

/**
 * Listen para mensajes desde la app
 */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('✅ Service Worker registrado correctamente');

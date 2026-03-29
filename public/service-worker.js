/**
 * Service Worker para Charlitron® Viajero del Tiempo
 * Permite que la app se descargue y funcione offline
 */

const CACHE_NAME = 'charlitron-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
  '/opensearch.xml'
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
            if (cacheName !== CACHE_NAME) {
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
 * Maneja las peticiones (fetch strategy: network first, fallback to cache)
 */
self.addEventListener('fetch', event => {
  // Ignorar peticiones que no sean GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Network first strategy
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

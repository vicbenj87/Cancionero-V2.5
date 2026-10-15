/* ============================================================================
   sw.js · Service worker del cancionero
   ----------------------------------------------------------------------------
   Para qué sirve:
     1. Hace que la app se pueda instalar (Chrome/Edge/Android lo exigen).
     2. Guarda una copia para que abra SIN internet (el culto no depende del wifi).

   Estrategia: "primero la red, si falla la copia guardada".
     Así, cuando cambias js/config.js (la lista semanal) o js/data/canciones.js,
     quien tenga conexión ve el cambio al instante. Sin conexión, ve lo último
     que guardó. No hay que tocar nada más para publicar cambios.

   Solo se toca el caché de ESTA app (prefijo "cancionero-"). Si algún día
   cambias la estructura de archivos, sube el número de VERSION y las copias
   viejas se borran solas.
   ============================================================================ */

var VERSION = 'cancionero-v1';

/* Lo mínimo para que la app abra sin conexión. Las rutas son relativas al
   propio sw.js, así que sirven igual en GitHub Pages (/Cancionero-V2.5/) que
   en un dominio propio. */
var PRECACHE = [
  './',
  './index.html',
  './editor.html',
  './manifest.webmanifest',
  './css/app.css',
  './css/backgrounds.css',
  './css/editor.css',
  './js/config.js',
  './js/data/canciones.js',
  './js/app.js',
  './js/editor.js',
  './js/pwa.js',
  './media/marca/logo-ibm-el-vivero.png',
  './media/pwa/icon-192.png',
  './media/pwa/icon-512.png',
  './media/pwa/apple-touch-icon.png'
];

self.addEventListener('install', function (ev) {
  ev.waitUntil(
    caches.open(VERSION).then(function (cache) {
      /* Uno por uno: si un archivo falla (404), los demás igual se guardan.
         cache.addAll() es todo-o-nada y dejaría la app sin instalar. */
      return Promise.all(PRECACHE.map(function (url) {
        return cache.add(url).catch(function () { /* se ignora */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys().then(function (claves) {
      return Promise.all(claves.map(function (clave) {
        if (clave.indexOf('cancionero-') === 0 && clave !== VERSION) {
          return caches.delete(clave);
        }
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (ev) {
  var req = ev.request;

  /* Solo GET del mismo sitio. Lo de otros dominios y los envíos de
     formularios pasan directo, sin tocarlos. */
  if (req.method !== 'GET') { return; }
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) { return; }

  /* Los videos piden "rangos" de bytes; una respuesta parcial no se puede
     guardar entera. Se dejan pasar sin caché. */
  if (req.headers.has('range')) { return; }

  ev.respondWith(
    fetch(req).then(function (resp) {
      /* Solo se guarda lo que respondió bien. */
      if (resp && resp.status === 200 && resp.type === 'basic') {
        var copia = resp.clone();
        caches.open(VERSION).then(function (cache) { cache.put(req, copia); });
      }
      return resp;
    }).catch(function () {
      /* Sin conexión: la copia guardada. */
      return caches.match(req).then(function (guardada) {
        if (guardada) { return guardada; }
        /* Si pidieron una página y no hay copia exacta, se abre el índice. */
        if (req.mode === 'navigate') { return caches.match('./index.html'); }
        return new Response('', { status: 504, statusText: 'Sin conexión' });
      });
    })
  );
});

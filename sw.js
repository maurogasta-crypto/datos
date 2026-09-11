/* ═══════════════════════════════════════════════════════════
   sw.js — el service worker del panel.
   Sello: sw-3

   Hace que el panel se instale en el teléfono y abra sin señal.

   RED PRIMERO, caché de respaldo. Es la estrategia que ya usa CasaYourte y
   se trae tal cual (PROTOCOLO-GENERAL § reglas: si un sitio ya lo resolvió,
   se lleva). Con caché primero, una tanda nueva no llegaría hasta que el
   teléfono decidiera revalidar — y este panel se toca todos los días.

   ⚠ SI CAMBIA UN ARCHIVO DE `SHELL`, SUBE `VERSION`. Si no, el teléfono
   sirve una mezcla de viejo y nuevo, que es el peor de los dos mundos:
   parece que el despliegue no hizo nada y en realidad hizo la mitad.
   ═══════════════════════════════════════════════════════════ */

const VERSION = 'panel-shell-v5';

/* Sin `?v=` a propósito. El panel pide `estilos.css?v=estilos-4` y
   `nucleo.js?v=nucleo-3`, y repetir esos números acá sería la TERCERA copia
   del mismo dato —el sello, la dirección y esta lista—, que es el error que
   este ecosistema ya cometió cuatro veces. En cambio, la búsqueda en caché
   ignora la parte del `?`: ver `ignoreSearch` más abajo. */
const SHELL = [
  './',
  './index.html',
  './estilos.css',
  './nucleo.js',
  './firebase-init.js',
  './manifest.json',
  './icono-192.png',
  './icono-512.png',
  './apple-touch-icon.png'
];

/* OJO: `addAll` es todo o nada. Si UN archivo falta o da 404, la instalación
   entera falla, el service worker nuevo nunca se activa y la app queda
   servida por el viejo — y parece que el despliegue no hizo nada. Se guarda
   de a uno tolerando faltantes: lo que no esté se buscará por red igual,
   porque la estrategia es red primero. */
self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.all(SHELL.map((u) =>
        c.add(u).catch((e) => console.warn('SW: no se pudo precachear', u, e))
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(
        claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Sólo se guarda una respuesta completa y correcta. Un 206 (trozo), un 30x o
   un error no se cachean nunca. */
const guardable = (r) => r && r.status === 200 && (r.type === 'basic' || r.type === 'default');

/* La búsqueda ignora el `?v=`. Sin esto, `estilos.css?v=estilos-5` no
   encontraría nada guardado y el panel abriría sin estilos la primera vez sin
   señal después de una tanda. Y no arriesga servir lo viejo estando en línea:
   la caché sólo se consulta cuando la red ya falló. */
const enCache = (req) => caches.match(req, { ignoreSearch: true });

function guardar(req, res) {
  if (!guardable(res)) return;
  const copia = res.clone();
  caches.open(VERSION).then((c) => c.put(req, copia)).catch(() => {});
}

self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET') return;
  if (ev.request.headers.has('range')) return;

  const url = new URL(ev.request.url);

  /* Navegación: red primero; sin señal, lo guardado; y si tampoco está, el
     panel, que es la única pantalla que existe. */
  if (ev.request.mode === 'navigate') {
    ev.respondWith(
      fetch(ev.request)
        .then((r) => { guardar(ev.request, r); return r; })
        .catch(() => enCache(ev.request).then((r) => r || enCache('./index.html')))
    );
    return;
  }

  if (url.origin === location.origin) {
    ev.respondWith(
      fetch(ev.request)
        .then((r) => { guardar(ev.request, r); return r; })
        .catch(() => enCache(ev.request))
    );
  }
  /* Todo lo demás —el SDK de Firebase en gstatic, Firestore— sigue su camino.
     Firestore trae su propia caché persistente, que es la que hace que los
     datos estén sin señal. Ver firebase-init.js. */
});

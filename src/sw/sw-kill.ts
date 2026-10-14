/// <reference lib="webworker" />
/**
 * Build de EMERGENCIA del Service Worker (kill-switch, plan §11.6). Se compila
 * en lugar de `sw.ts` con `VITE_APP_SW_KILL=true` y se publica en el mismo
 * `/sw.js`. Ver `docs/offline/KILL-SWITCH.md`.
 *
 * Al instalarse toma el control enseguida, borra SOLO las caches de la Cache
 * API (precache del shell), se desregistra y recarga las pestañas abiertas.
 * NUNCA toca IndexedDB: ahí vive la outbox (Fase 2), y la app sin SW sigue
 * sincronizando.
 *
 * Se inyecta `__WB_MANIFEST` vacío de uso para que `injectManifest` no falle
 * al no encontrar el placeholder.
 */
declare const self: ServiceWorkerGlobalScope

void self.__WB_MANIFEST

self.addEventListener("install", () => {
  void self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
      await self.registration.unregister()
      const clients = await self.clients.matchAll({ type: "window" })
      await Promise.all(clients.map((client) => client.navigate(client.url).catch(() => undefined)))
    })(),
  )
})

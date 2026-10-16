/// <reference lib="webworker" />
/**
 * Service Worker de app shell (Fase 1 offline, `openspec/changes/add-offline-reads`,
 * plan §3 D2 / §11 Fase 1).
 *
 * Qué hace:
 *   - precachea todo `dist/` (shell + chunks lazy) con el manifest que inyecta
 *     `vite-plugin-pwa` (`injectManifest`);
 *   - responde las NAVEGACIONES con `index.html` del precache, salvo `/api`.
 *
 * Qué NO hace, a propósito:
 *   - no registra ninguna ruta para `/api/*`: esas requests ni siquiera las
 *     intercepta (no hay `respondWith`), van directo a la red. Las lecturas
 *     offline las da el persister de TanStack Query (D2), no la Cache API
 *     (casi todo es POST y la cache del SW no es por usuario).
 *   - `/verificar/b/<codigo>` solo recibe el shell por el fallback de
 *     navegación; la llamada a la API de verificación va a red siempre, así un
 *     "VIGENTE" viejo nunca se muestra desde cache (C-80).
 *   - no hace `skipWaiting` solo: espera el mensaje `SKIP_WAITING` que manda el
 *     toast "Actualizar" (`lib/offline/sw-update.ts`), que a su vez no lo manda
 *     mientras haya una sincronización en curso.
 */
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching"
import { NavigationRoute, registerRoute } from "workbox-routing"

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

registerRoute(
  new NavigationRoute(createHandlerBoundToURL("/index.html"), {
    denylist: [/^\/api(\/|$)/],
  }),
)

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting()
})

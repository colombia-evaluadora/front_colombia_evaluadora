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

// ---- Web Push (`openspec/changes/add-notificaciones-push-webpush`, D-4.6) --
//
// El payload es MÍNIMO (D-4.2): `{ id, tipo, titulo?, cuerpo?, url? }` sin
// datos personales. Siempre se muestra el texto genérico; el SW no tiene token
// (regla de token solo en memoria), así que el detalle lo pide la pestaña con
// sesión cuando recibe `PUSH_RECEIVED`. `tag = id` permite reemplazar y cerrar
// la notificación cuando se lee en otro dispositivo.

interface PushPayload {
  id?: string
  tipo?: string
  titulo?: string
  cuerpo?: string
  url?: string
}

const PUSH_TITULO = "Colombia Evaluadora"
const PUSH_CUERPO = "Tienes una notificación nueva"
const PUSH_DEFAULT_URL = "/app/notificaciones"

function readPushPayload(data: PushMessageData | null): PushPayload {
  if (!data) return {}
  try {
    return (data.json() as PushPayload) ?? {}
  } catch {
    return {}
  }
}

/** Solo rutas internas: un deep link absoluto a otro origen se descarta. */
function safeDeepLink(url: string | undefined): string {
  if (!url) return PUSH_DEFAULT_URL
  try {
    const target = new URL(url, self.location.origin)
    if (target.origin !== self.location.origin) return PUSH_DEFAULT_URL
    return target.pathname + target.search + target.hash
  } catch {
    return PUSH_DEFAULT_URL
  }
}

async function postToClients(message: Record<string, unknown>) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
  for (const client of clients) client.postMessage(message)
  return clients
}

self.addEventListener("push", (event) => {
  const payload = readPushPayload(event.data)
  const id = payload.id ? String(payload.id) : undefined
  const url = safeDeepLink(payload.url)
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(PUSH_TITULO, {
        body: PUSH_CUERPO,
        tag: id,
        icon: "/favicon.svg",
        data: { id, url },
      })
      await postToClients({ type: "PUSH_RECEIVED", id, tipo: payload.tipo })
      // Badge del ícono instalado (no soportado en todos lados).
      const nav = self.navigator as WorkerNavigator & { setAppBadge?: () => Promise<void> }
      await nav.setAppBadge?.().catch(() => undefined)
    })(),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const { id, url } = (event.notification.data ?? {}) as { id?: string; url?: string }
  const target = safeDeepLink(url)
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      const existing = clients.find((c) => new URL(c.url).origin === self.location.origin)
      if (existing) {
        // La pestaña navega con el router y hace el `PATCH .../leida` con su
        // sesión (el SW no tiene token).
        existing.postMessage({ type: "PUSH_CLICKED", id, url: target })
        await existing.focus()
        return
      }
      const opened = await self.clients.openWindow(target)
      // La pestaña nueva todavía no escucha mensajes: el leído lo resuelve la
      // página de destino al abrir el deep link.
      opened?.postMessage({ type: "PUSH_CLICKED", id, url: target })
    })(),
  )
})

// El navegador rotó/expiró la suscripción: re-suscribir con la misma clave
// VAPID y avisar a las pestañas para que la registren con su sesión
// (`startPushClientSync`).
self.addEventListener("pushsubscriptionchange", (event) => {
  const change = event as Event & {
    oldSubscription?: PushSubscription | null
    newSubscription?: PushSubscription | null
    waitUntil(promise: Promise<unknown>): void
  }
  change.waitUntil(
    (async () => {
      let subscription = change.newSubscription ?? null
      const key = change.oldSubscription?.options?.applicationServerKey
      if (!subscription && key) {
        subscription = await self.registration.pushManager
          .subscribe({ userVisibleOnly: true, applicationServerKey: key })
          .catch(() => null)
      }
      if (subscription) await postToClients({ type: "PUSH_SUBSCRIPTION_CHANGED" })
    })(),
  )
})

// Leída en otro dispositivo (task 3.6): la pestaña pide cerrar por `tag`.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "CLOSE_NOTIFICATION" || !event.data.id) return
  event.waitUntil(
    self.registration
      .getNotifications({ tag: String(event.data.id) })
      .then((list) => list.forEach((n) => n.close())),
  )
})

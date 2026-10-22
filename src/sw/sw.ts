/// <reference lib="webworker" />
/**
 * Service Worker de app shell (Fase 1 offline, `openspec/changes/add-offline-reads`,
 * plan §3 D2 / §11 Fase 1).
 *
 * Qué hace:
 *   - precachea todo `dist/` (shell + chunks lazy) con el manifest que inyecta
 *     `vite-plugin-pwa` (`injectManifest`);
 *   - responde las NAVEGACIONES (salvo `/api`) red-primero con timeout y
 *     fallback a `index.html` del precache o a una página inline: nunca rechaza.
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
  getCacheKeyForURL,
  matchPrecache,
  precacheAndRoute,
} from "workbox-precaching"
import { NavigationRoute, registerRoute } from "workbox-routing"

declare const self: ServiceWorkerGlobalScope

// ---- Navegaciones: NetworkFirst con timeout y fallback que NUNCA rechaza ----
//
// Antes se usaba `createHandlerBoundToURL("/index.html")`, que TIRA si
// `/index.html` no está en el precache (lo borró la activación de otra
// versión, una instalación a medias, el usuario limpió la Cache API…). La
// promesa de `respondWith` rechazaba y Chrome mostraba "No se puede acceder a
// este sitio web · ERR_FAILED" aunque el servidor respondiera 200 (incidente
// en testv2). Ahora:
//   1. red con timeout corto (`index.html` va `no-cache`: online siempre se
//      quiere el más nuevo);
//   2. sin red / timeout / 5xx → `index.html` del precache;
//   3. sin precache → cualquier `index.html` que quede en otra cache;
//   4. nada → página mínima inline con botón de reintentar.
// Sin red de verdad `fetch` falla al instante, así que offline el shell sale
// del cache sin esperar el timeout.

const NAVIGATION_TIMEOUT_MS = 3500

const OFFLINE_FALLBACK_HTML = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Colombia Evaluadora</title>
<style>body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;margin:0;align-items:center;justify-content:center;background:#fff;color:#1f2937;padding:16px;box-sizing:border-box}
main{max-width:28rem;text-align:center}button{margin-top:16px;padding:10px 20px;border:0;border-radius:8px;background:#1d4ed8;color:#fff;font-size:1rem;cursor:pointer}
@media (prefers-color-scheme:dark){body{background:#111827;color:#f3f4f6}}</style></head>
<body><main><h1 style="font-size:1.25rem">No se pudo cargar Colombia Evaluadora</h1>
<p>Revisa tu conexión y vuelve a intentar.</p>
<button type="button" onclick="location.reload()">Reintentar</button></main></body></html>`

function fetchWithTimeout(request: Request, ms: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms)
    fetch(request).then(
      (response) => {
        clearTimeout(timer)
        resolve(response)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

let selfHealScheduled = false

/**
 * El precache perdió `index.html`: la instalación quedó corrupta. Se pide un
 * `update()` para que el navegador reinstale el SW si hay uno nuevo (la
 * instalación es atómica). No se desregistra ni se recarga desde acá: sin red
 * eso es un bucle de recargas; la navegación ya se resolvió por red o con la
 * página inline. Si hiciera falta forzarlo, está el kill-switch (nivel 3).
 */
function scheduleSelfHeal() {
  if (selfHealScheduled) return
  selfHealScheduled = true
  void self.registration.update().catch(() => undefined)
}

async function cachedShell(): Promise<Response | undefined> {
  try {
    const precached = await matchPrecache("/index.html")
    if (precached) return precached
  } catch {
    // Cache API inaccesible: se sigue con el resto de los fallbacks.
  }
  scheduleSelfHeal()
  try {
    const key = getCacheKeyForURL("/index.html")
    return (
      (key ? await caches.match(key, { ignoreSearch: true }) : undefined) ??
      (await caches.match("/index.html", { ignoreSearch: true })) ??
      (await caches.match("/", { ignoreSearch: true }))
    )
  } catch {
    return undefined
  }
}

function inlineFallback(): Response {
  return new Response(OFFLINE_FALLBACK_HTML, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  })
}

async function handleNavigation({ request }: { request: Request }): Promise<Response> {
  let network: Response | undefined
  try {
    network = await fetchWithTimeout(request, NAVIGATION_TIMEOUT_MS)
    if (network.status < 500) return network
  } catch {
    // sin red o timeout
  }
  try {
    const shell = await cachedShell()
    if (shell) return shell
  } catch {
    // nunca rechazar
  }
  return network ?? inlineFallback()
}

// Se registra ANTES que `precacheAndRoute`: Workbox usa la primera ruta que
// matchea y la ruta de precache también atiende `/` (directoryIndex) con una
// estrategia que rechaza si falta la entrada y no hay red.
registerRoute(
  new NavigationRoute(handleNavigation, {
    denylist: [/^\/api(\/|$)/],
  }),
)

// `precacheAndRoute` instala atómicamente (baja todo a una cache temporal y solo
// la promueve si TODO llegó; si falla una entrada, la instalación falla y sigue
// el SW anterior). La limpieza de entradas viejas y `cleanupOutdatedCaches`
// corren en `activate`, que solo ocurre tras "Actualizar" (SKIP_WAITING) o al
// cerrar todas las pestañas; "Actualizar" recarga la página, así ninguna
// pestaña vieja sigue pidiendo chunks de un precache ya limpiado. Y aunque el
// precache quede incompleto, las navegaciones caen al fallback de arriba.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

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

/**
 * Invitación a un grupo (CHAT_GRUPO_INVITACION, acudientes): el aviso ofrece Aceptar / Rechazar.
 * El SW no tiene sesión, así que el botón solo abre el chat con `accion=` y la pestaña responde.
 */
const TIPO_INVITACION = "CHAT_GRUPO_INVITACION"
const ACCIONES_INVITACION = [
  { action: "aceptar", title: "Aceptar" },
  { action: "rechazar", title: "Rechazar" },
]

/** Deep link con la acción del botón (`aceptar` / `rechazar`); sin acción, el mismo. */
function conAccionInvitacion(url: string, action: string | undefined): string {
  if (action !== "aceptar" && action !== "rechazar") return url
  return `${url}${url.includes("?") ? "&" : "?"}accion=${action}`
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
      const invitacion = payload.tipo === TIPO_INVITACION
      await self.registration.showNotification(PUSH_TITULO, {
        body: invitacion ? "Te invitaron a un grupo" : PUSH_CUERPO,
        tag: id,
        icon: "/favicon.svg",
        data: { id, url },
        // `actions` no está en todos los tipos de NotificationOptions del DOM.
        ...(invitacion ? ({ actions: ACCIONES_INVITACION } as NotificationOptions) : {}),
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
  const target = conAccionInvitacion(safeDeepLink(url), event.action)
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

// Background Sync (Chromium): al volver la red el navegador dispara `sync`
// con el tag que registró la outbox. El SW no envía nada (la sync corre en la
// página, D4): solo despierta a las pestañas abiertas con `outbox:wake`.
self.addEventListener("sync", ((event: Event & { tag?: string; waitUntil: (p: Promise<unknown>) => void }) => {
  if (event.tag !== "ce-outbox") return
  event.waitUntil(postToClients({ type: "outbox:wake" }))
}) as EventListener)

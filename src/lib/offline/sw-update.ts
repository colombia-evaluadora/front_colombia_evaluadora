/**
 * Registro del Service Worker de la PWA y aviso de nueva versión (plan §7.10,
 * spec `app-shell`).
 *
 * - No se registra con MSW activo (sólo debe existir el worker de MSW).
 * - Con el modo offline en `off` (kill-switch) se DESREGISTRA el SW de la app
 *   (no el de MSW) y se borran sus caches; IndexedDB no se toca.
 * - `registerType: "prompt"`: la versión nueva queda en espera y se muestra un
 *   toast persistente con "Actualizar". Nunca se activa sola, y "Actualizar" no
 *   aplica mientras haya una sincronización en curso (`isSyncInProgress`).
 */
import { toast } from "sonner"
import { env } from "@/config/env"
import { getOfflineMode, resolveOfflineMode } from "@/lib/offline/offline-mode"

const UPDATE_TOAST_ID = "sw-update"
const UPDATE_MESSAGE = "Hay una nueva versión de Colombia Evaluadora."
const WAIT_SYNC_MESSAGE = "Termina de sincronizar para actualizar"
/** Revisa si hay una versión nueva cada hora en pestañas que quedan abiertas. */
const UPDATE_CHECK_MS = 60 * 60 * 1000

/**
 * Punto de enganche para la outbox (Fase 2): debe devolver `true` mientras
 * haya un lote sincronizando u operaciones pendientes. Hoy no hay outbox.
 */
export function isSyncInProgress(): boolean {
  return false
}

let applyUpdate: (() => Promise<void>) | null = null
let updateDeferred = false

/**
 * La outbox (Fase 2) debe llamarla al terminar un lote: si el usuario pidió
 * actualizar mientras sincronizaba, la versión nueva se aplica ahora.
 */
export function notifySyncIdle() {
  if (updateDeferred && applyUpdate && !isSyncInProgress()) {
    updateDeferred = false
    void applyUpdate()
  }
}

function showUpdateToast() {
  toast.info(UPDATE_MESSAGE, {
    id: UPDATE_TOAST_ID,
    duration: Number.POSITIVE_INFINITY,
    dismissible: false,
    action: {
      label: "Actualizar",
      onClick: (event) => {
        if (isSyncInProgress()) {
          // Sonner cierra el toast al hacer clic: se impide y se avisa.
          event.preventDefault()
          updateDeferred = true
          toast.info(UPDATE_MESSAGE, {
            id: UPDATE_TOAST_ID,
            description: WAIT_SYNC_MESSAGE,
            duration: Number.POSITIVE_INFINITY,
            dismissible: false,
          })
          return
        }
        void applyUpdate?.()
      },
    },
  })
}

/** Desregistra el SW de la PWA (deja el de MSW) y borra sus caches. */
export async function unregisterAppServiceWorker() {
  if (!("serviceWorker" in navigator)) return
  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(
    registrations
      .filter((r) => {
        const url = (r.active ?? r.waiting ?? r.installing)?.scriptURL ?? ""
        return !url.endsWith("/mockServiceWorker.js")
      })
      .map((r) => r.unregister()),
  )
  if ("caches" in window) {
    const keys = await caches.keys()
    await Promise.all(keys.filter((k) => k.startsWith("workbox-")).map((k) => caches.delete(k)))
  }
}

/** Se llama una vez al arrancar (`main.tsx`). Nunca tira ni bloquea el render. */
export async function setupServiceWorker() {
  if (env.ENABLE_API_MOCKING || !import.meta.env.PROD) return
  if (!("serviceWorker" in navigator)) return
  try {
    if (getOfflineMode() === "off" || (await resolveOfflineMode()) === "off") {
      await unregisterAppServiceWorker()
      return
    }
    const { registerSW } = await import("virtual:pwa-register")
    const updateSW = registerSW({
      onNeedRefresh: showUpdateToast,
      onRegisteredSW(_url, registration) {
        if (!registration) return
        setInterval(() => {
          if (navigator.onLine) void registration.update().catch(() => undefined)
        }, UPDATE_CHECK_MS)
      },
    })
    applyUpdate = () => updateSW(true)
  } catch (error) {
    console.warn("[sw] no se pudo registrar el service worker", error)
  }
}

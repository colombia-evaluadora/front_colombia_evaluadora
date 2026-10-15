/**
 * Detección pura de soporte de Web Push (sin React ni red), para que la UX de
 * permiso (`PushToggle`) y los tests compartan las mismas reglas.
 *
 * Reglas (`openspec/changes/add-notificaciones-push-webpush`, D-4.5):
 *   - sin clave VAPID pública en el build → la funcionalidad no existe;
 *   - iOS/iPadOS solo recibe push con la PWA instalada (`display-mode:
 *     standalone`, iOS ≥ 16.4): en Safari en pestaña se muestra la guía de
 *     instalación en vez del botón;
 *   - permiso `denied` → instrucciones para habilitarlo en el navegador.
 */

export type PushAvailability =
  | "sin-clave" // build sin VITE_APP_VAPID_PUBLIC_KEY: ocultar todo
  | "no-soportado" // navegador sin Service Worker / PushManager / Notification
  | "ios-requiere-instalar" // iOS/iPadOS en pestaña: guía de instalación
  | "denegado" // el usuario bloqueó las notificaciones del sitio
  | "disponible" // se puede pedir permiso (solo tras un gesto)

export interface PushEnvironment {
  vapidPublicKey: string
  userAgent: string
  maxTouchPoints: number
  standalone: boolean
  hasServiceWorker: boolean
  hasPushManager: boolean
  hasNotification: boolean
  permission: NotificationPermission | null
}

/** iPhone/iPod, o iPad (incluido iPadOS ≥ 13 que se presenta como Mac). */
export function isIosDevice(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1
}

export function getPushAvailability(e: PushEnvironment): PushAvailability {
  if (!e.vapidPublicKey) return "sin-clave"
  // En iOS fuera de la PWA no existe `PushManager`: hay que mirar iOS antes
  // que el soporte para mostrar la guía y no un "no soportado".
  if (isIosDevice(e.userAgent, e.maxTouchPoints) && !e.standalone) return "ios-requiere-instalar"
  if (!e.hasServiceWorker || !e.hasPushManager || !e.hasNotification) return "no-soportado"
  if (e.permission === "denied") return "denegado"
  return "disponible"
}

/** Lee el entorno real del navegador (seguro fuera de `window`). */
export function readPushEnvironment(vapidPublicKey: string): PushEnvironment {
  const hasWindow = typeof window !== "undefined"
  const nav = hasWindow ? window.navigator : undefined
  return {
    vapidPublicKey,
    userAgent: nav?.userAgent ?? "",
    maxTouchPoints: nav?.maxTouchPoints ?? 0,
    standalone:
      hasWindow &&
      ((typeof window.matchMedia === "function" &&
        window.matchMedia("(display-mode: standalone)").matches) ||
        (nav as Navigator & { standalone?: boolean })?.standalone === true),
    hasServiceWorker: Boolean(nav && "serviceWorker" in nav),
    hasPushManager: hasWindow && "PushManager" in window,
    hasNotification: hasWindow && "Notification" in window,
    permission: hasWindow && "Notification" in window ? Notification.permission : null,
  }
}

/** Plataforma gruesa para la lista de dispositivos (sin fingerprinting). */
export function detectPlataforma(userAgent: string, maxTouchPoints = 0): string {
  if (isIosDevice(userAgent, maxTouchPoints)) return "iOS"
  if (/Android/i.test(userAgent)) return "Android"
  if (/Windows/i.test(userAgent)) return "Windows"
  if (/Mac OS X|Macintosh/i.test(userAgent)) return "macOS"
  if (/Linux|CrOS/i.test(userAgent)) return "Linux"
  return "Otro"
}

/** Clave VAPID base64url → bytes para `applicationServerKey`. */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/**
 * Suscripción Web Push de ESTE navegador (sin React).
 *
 * - La suscripción va ligada a la sesión (D-4.4): se guarda en
 *   `localStorage` el `sub` del usuario dueño. En logout se borra en el
 *   backend (`DELETE` con el token todavía vivo) y en el navegador
 *   (`unsubscribe()`); si entra otro usuario se desuscribe localmente (el
 *   backend reasigna el `endpoint` si el nuevo usuario se vuelve a suscribir).
 * - Equipo compartido (`lib/offline`, modo `compartido`): `PushToggle` exige
 *   un opt-in explícito antes de llamar a `subscribeThisDevice`.
 * - El SW no tiene token: cuando el navegador rota la suscripción
 *   (`pushsubscriptionchange`) el SW se re-suscribe y avisa a las pestañas;
 *   `startPushClientSync` registra la nueva en el backend con la sesión de la
 *   pestaña.
 */
import {
  deletePushSuscripcionPorEndpoint,
  postPushSuscripcion,
  type PushSuscripcionInput,
} from "@/features/notificaciones/push/api/push-api"
import {
  detectPlataforma,
  urlBase64ToUint8Array,
} from "@/features/notificaciones/push/lib/push-support"

const OWNER_KEY = "push:owner"

function readOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY)
  } catch {
    return null
  }
}

function writeOwner(sub: string | null) {
  try {
    if (sub) localStorage.setItem(OWNER_KEY, sub)
    else localStorage.removeItem(OWNER_KEY)
  } catch {
    // Sin storage: la limpieza en logout igual corre por la suscripción viva.
  }
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null
  try {
    return (await navigator.serviceWorker.getRegistration()) ?? null
  } catch {
    return null
  }
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  const reg = await getRegistration()
  if (!reg?.pushManager) return null
  try {
    return await reg.pushManager.getSubscription()
  } catch {
    return null
  }
}

export function toSuscripcionInput(subscription: PushSubscription): PushSuscripcionInput {
  const json = subscription.toJSON()
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent
  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
    userAgent: ua,
    plataforma: detectPlataforma(ua, typeof navigator === "undefined" ? 0 : navigator.maxTouchPoints),
  }
}

export class PushPermissionError extends Error {
  readonly permission: NotificationPermission
  constructor(permission: NotificationPermission) {
    super(
      permission === "denied"
        ? "Las notificaciones están bloqueadas en este navegador."
        : "No se concedió el permiso de notificaciones.",
    )
    this.permission = permission
  }
}

/**
 * Pide permiso (DEBE llamarse desde un clic, D-4.5), suscribe el navegador
 * con la clave VAPID propia y registra la suscripción en el backend.
 */
export async function subscribeThisDevice({
  vapidPublicKey,
  userSub,
}: {
  vapidPublicKey: string
  userSub: string
}): Promise<PushSubscription> {
  const permission = await Notification.requestPermission()
  if (permission !== "granted") throw new PushPermissionError(permission)

  const reg = await getRegistration()
  if (!reg?.pushManager) {
    throw new Error("El Service Worker de la aplicación no está activo en este navegador.")
  }
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }))

  try {
    await postPushSuscripcion(toSuscripcionInput(subscription))
  } catch (error) {
    // Sin alta en el backend la suscripción no sirve: no dejarla colgada.
    await subscription.unsubscribe().catch(() => undefined)
    throw error
  }
  writeOwner(userSub)
  return subscription
}

/** Baja de este navegador en el backend y en el push service. */
export async function unsubscribeThisDevice(): Promise<void> {
  const subscription = await getCurrentSubscription()
  writeOwner(null)
  if (!subscription) return
  // Sin red no se espera el timeout del DELETE: la baja local alcanza (el
  // push service responderá 404/410 y el backend la invalida, D-4.3).
  if (navigator.onLine) {
    await deletePushSuscripcionPorEndpoint(subscription.endpoint).catch(() => undefined)
  }
  await subscription.unsubscribe().catch(() => undefined)
}

/**
 * Logout (spec "Limpieza en logout"): se llama ANTES de `POST /auth/logout`
 * para que el `DELETE` todavía lleve el token. Nunca tira.
 */
export async function cleanupPushOnLogout(): Promise<void> {
  try {
    await unsubscribeThisDevice()
  } catch {
    // El logout no puede fallar por el push.
  }
}

/**
 * Login de un usuario: si la suscripción viva es de OTRO usuario se suelta
 * en el navegador (el token del anterior ya no existe para el DELETE; el
 * backend reasigna o invalida el endpoint). Nunca tira.
 */
export async function releasePushIfOtherUser(userSub: string): Promise<void> {
  try {
    const owner = readOwner()
    const subscription = await getCurrentSubscription()
    if (!subscription) {
      if (owner) writeOwner(null)
      return
    }
    if (owner === userSub) return
    writeOwner(null)
    await subscription.unsubscribe()
  } catch {
    // Mejor esfuerzo.
  }
}

export function isSubscribedBy(userSub: string | null | undefined): boolean {
  return Boolean(userSub) && readOwner() === userSub
}

// ---- Mensajes del Service Worker -------------------------------------------

export const SW_PUSH_MESSAGES = {
  received: "PUSH_RECEIVED",
  clicked: "PUSH_CLICKED",
  subscriptionChanged: "PUSH_SUBSCRIPTION_CHANGED",
  closeNotification: "CLOSE_NOTIFICATION",
} as const

export interface SwPushMessage {
  type: (typeof SW_PUSH_MESSAGES)[keyof typeof SW_PUSH_MESSAGES]
  id?: string
  tipo?: string
  url?: string
}

/**
 * Escucha los mensajes de push del SW (recibido / clic / rotación). El
 * centro de notificaciones lo usa para refrescar el contador y hacer el
 * `PATCH .../leida` con la sesión de la pestaña (D-4.6). Devuelve la baja.
 */
export function onSwPushMessage(handler: (message: SwPushMessage) => void): () => void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return () => {}
  const listener = (event: MessageEvent) => {
    const data = event.data as SwPushMessage | undefined
    if (!data || typeof data.type !== "string" || !data.type.startsWith("PUSH_")) return
    handler(data)
  }
  navigator.serviceWorker.addEventListener("message", listener)
  return () => navigator.serviceWorker.removeEventListener("message", listener)
}

/**
 * Pide al SW cerrar la notificación del sistema con `tag = id` (leída en
 * otro dispositivo, task 3.6). Mejor esfuerzo.
 */
export async function closeSystemNotification(id: string): Promise<void> {
  const reg = await getRegistration()
  reg?.active?.postMessage({ type: SW_PUSH_MESSAGES.closeNotification, id })
}

/**
 * Re-registra en el backend la suscripción que rotó el navegador. Se arranca
 * una vez (`main.tsx`); si no hay sesión el POST falla en silencio y se
 * reintenta en el próximo `pushsubscriptionchange`.
 */
export function startPushClientSync(): () => void {
  return onSwPushMessage((message) => {
    if (message.type !== SW_PUSH_MESSAGES.subscriptionChanged) return
    if (!readOwner()) return
    void (async () => {
      const subscription = await getCurrentSubscription()
      if (!subscription) return
      await postPushSuscripcion(toSuscripcionInput(subscription)).catch(() => undefined)
    })()
  })
}

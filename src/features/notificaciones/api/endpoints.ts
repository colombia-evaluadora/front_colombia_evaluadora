import { apiPath } from "@/lib/api-routes"

/**
 * Prefijo del gateway hacia `notification-service` (D-2.2: el inbox NO vive en
 * eval-col). El api-gateway expone `/api/notificaciones/**` →
 * `lb://notification-service` con StripPrefix=1 (PR SSO #690), o sea que la
 * ruta real es la misma que intercepta MSW: prefijo vacío en ambos modos.
 * Los ids de notificación son UUID (string); el dueño de la bandeja es el
 * `sub` del JWT (correo), que el backend saca del Bearer: el front nunca lo manda.
 */
export const NOTIFICACIONES_API_PREFIX = ""

const ruta = (path: string) => apiPath(path, path, NOTIFICACIONES_API_PREFIX)

export const NOTIFICACIONES_ENDPOINTS = {
  lista: () => ruta("/notificaciones"),
  contador: () => ruta("/notificaciones/contador"),
  leida: (id: string) => ruta(`/notificaciones/${encodeURIComponent(id)}/leida`),
  leerTodas: () => ruta("/notificaciones/leer-todas"),
  leerConversacion: (canal: number) => ruta(`/notificaciones/leer-conversacion/${canal}`),
  archivar: (id: string) => ruta(`/notificaciones/${encodeURIComponent(id)}/archivar`),
  preferencias: () => ruta("/notificaciones/preferencias"),
} as const

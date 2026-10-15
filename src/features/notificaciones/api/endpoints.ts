import { apiPath } from "@/lib/api-routes"

/**
 * Prefijo del gateway hacia `notification-service` (D-2.2: el inbox NO vive en
 * eval-col). Cuando el backend exista y se registre su ruta en el api-gateway,
 * si el `requesturi` resulta ser otro (p. ej. `/notification`), basta con
 * cambiar esta constante: el mock de MSW intercepta las rutas "sin prefijo".
 */
export const NOTIFICACIONES_API_PREFIX = ""

const ruta = (path: string) => apiPath(path, path, NOTIFICACIONES_API_PREFIX)

export const NOTIFICACIONES_ENDPOINTS = {
  lista: () => ruta("/notificaciones"),
  contador: () => ruta("/notificaciones/contador"),
  leida: (id: string) => ruta(`/notificaciones/${encodeURIComponent(id)}/leida`),
  leerTodas: () => ruta("/notificaciones/leer-todas"),
  archivar: (id: string) => ruta(`/notificaciones/${encodeURIComponent(id)}/archivar`),
  preferencias: () => ruta("/notificaciones/preferencias"),
} as const

import { safeDeepLink } from "@/features/notificaciones/lib/deep-link"

/** Duración del aviso emergente (informe de Comunicaciones §7.1: 5 segundos). */
export const AVISO_EMERGENTE_MS = 5000

export interface AvisoEmergente {
  id: string
  titulo: string
  cuerpo: string | undefined
  href: string
}

/** `?canal=` de un enlace del chat (`/app/comunicaciones/chat?canal=12&mensaje=3`). */
function canalDe(link: string): string | null {
  return /[?&]canal=(\d+)/.exec(link)?.[1] ?? null
}

/**
 * Aviso emergente de un `notification.created` (misma forma que una fila de `GET /notificaciones`).
 * Solo muestra tipo y título, nunca el cuerpo completo del contenido: `cuerpo_corto` ya viene
 * recortado por notification-service. No se muestra si el usuario ya está viendo esa conversación
 * (`ubicacion` = ruta + query actuales), porque el mensaje aparece en vivo en pantalla.
 */
export function avisoEmergente(evento: unknown, ubicacion: string): AvisoEmergente | null {
  if (typeof evento !== "object" || evento === null) return null
  const e = evento as { id?: unknown; tipo?: unknown; titulo?: unknown; cuerpo_corto?: unknown; deep_link?: unknown }
  // APP_ACCION confirma una escritura del propio usuario: la pantalla ya mostró su aviso.
  if (e.tipo === "APP_ACCION") return null
  if (typeof e.id !== "string" || typeof e.titulo !== "string" || e.titulo.trim() === "") return null
  const href = safeDeepLink(typeof e.deep_link === "string" ? e.deep_link : null)
  const canal = canalDe(href)
  if (canal != null && ubicacion.split("?")[0] === href.split("?")[0] && canalDe(ubicacion) === canal) return null
  return {
    id: e.id,
    titulo: e.titulo,
    cuerpo: typeof e.cuerpo_corto === "string" && e.cuerpo_corto.trim() !== "" ? e.cuerpo_corto : undefined,
    href,
  }
}

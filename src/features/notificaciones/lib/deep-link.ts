/** Invitación a un grupo del chat (acudientes): la notificación ofrece Aceptar / Rechazar. */
export const TIPO_INVITACION_GRUPO = "CHAT_GRUPO_INVITACION"

/** Destino cuando el deep link no es válido (spec "Deep link externo"). */
export const DEEP_LINK_FALLBACK = "/app/notificaciones"

/**
 * Solo se aceptan rutas internas de la app (`/app/...`). Cualquier otra cosa
 * —URL absoluta, `//host`, `javascript:`, `/app` sin barra final, rutas con
 * `..`— cae a la bandeja: el deep link lo arma el backend a partir de eventos
 * de dominio y no debe poder sacar al usuario de la app.
 */
export function safeDeepLink(link: string | null | undefined): string {
  if (!link) return DEEP_LINK_FALLBACK
  const trimmed = link.trim()
  if (!trimmed.startsWith("/app/")) return DEEP_LINK_FALLBACK
  if (trimmed.startsWith("//") || trimmed.includes("\\")) return DEEP_LINK_FALLBACK
  const pathname = trimmed.split(/[?#]/)[0]
  if (pathname.split("/").some((segment) => segment === ".." || segment === ".")) return DEEP_LINK_FALLBACK
  return trimmed
}

/** Etiqueta del contador de la campana: tope `9+` (requerimiento: el badge no crece a dos cifras). */
export function formatContador(n: number): string {
  if (!n || n < 0) return "0"
  return n > 9 ? "9+" : String(n)
}

/** "Ana y 4 más reaccionaron…": prefijo de actores de una entrada agrupada (D-2.4). */
export function formatActores(actores: string[], conteo: number): string | null {
  if (actores.length === 0) return null
  const total = Math.max(conteo, actores.length)
  if (total <= 1) return actores[0]
  return `${actores[0]} y ${total - 1} más`
}

/**
 * Tipos cuyo actor es siempre el propio dueño de la bandeja: `APP_ACCION` es la
 * confirmación de una escritura que hizo el usuario (sso V590 encola el aviso
 * para quien actuó, con `app.user_id` como actor). Anteponer su nombre
 * ("Laura Martínez: Áreas oficiales: …") no aporta nada.
 */
const TIPOS_ACCION_PROPIA = new Set(["APP_ACCION"])

/** Título visible: con el prefijo de actores solo si los actores son otras personas. */
export function tituloNotificacion(n: { tipo: string; titulo: string; actores: string[]; conteo: number }): string {
  const actores = TIPOS_ACCION_PROPIA.has(n.tipo) ? null : formatActores(n.actores, n.conteo)
  return actores ? `${actores}: ${n.titulo}` : n.titulo
}

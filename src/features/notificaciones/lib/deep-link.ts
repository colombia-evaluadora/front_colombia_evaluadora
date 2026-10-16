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

/** Etiqueta del contador de la campana: tope `99+` (spec "Campana"). */
export function formatContador(n: number): string {
  if (!n || n < 0) return "0"
  return n > 99 ? "99+" : String(n)
}

/** "Ana y 4 más reaccionaron…": prefijo de actores de una entrada agrupada (D-2.4). */
export function formatActores(actores: string[], conteo: number): string | null {
  if (actores.length === 0) return null
  const total = Math.max(conteo, actores.length)
  if (total <= 1) return actores[0]
  return `${actores[0]} y ${total - 1} más`
}

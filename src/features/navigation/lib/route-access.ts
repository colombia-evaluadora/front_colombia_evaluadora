/**
 * Qué rutas de `/app` puede abrir el usuario, según el mismo menú del sidebar
 * (`GET /eval-col/my-menus`): sin el módulo en el menú, tampoco por URL. Lo
 * usan el guard de `/app`, el ítem activo del sidebar y las migas.
 */

/** Lo único que este módulo necesita de un ítem del menú (`NavItem`). */
export interface MenuUrlSource {
  url: string
  items?: { url: string }[]
}

/** Abiertas a cualquier sesión: `/app` redirige, `/app/sin-acceso` es el destino del guard y `/app/pendientes` lista lo guardado sin conexión. */
export const ALWAYS_ALLOWED_PATHS: readonly string[] = ["/app", "/app/sin-acceso", "/app/pendientes"]

/**
 * Rutas que no cuelgan de la URL de su ítem del menú, con la URL de ese ítem.
 * Una ruta nueva en ese caso va acá, o el guard la bloquea (lo avisa el test).
 */
export const NAV_PATH_ALIASES: ReadonlyArray<readonly [from: string, to: string]> = [
  // Agregar, detalle y editar establecimiento viven al lado de `/general`.
  ["/app/establecimiento-educativo/agregar", "/app/establecimiento-educativo/general"],
  ["/app/establecimiento-educativo/detalle", "/app/establecimiento-educativo/general"],
  ["/app/establecimiento-educativo/editar", "/app/establecimiento-educativo/general"],
  // Un solo ítem de menú para sesiones y tablas.
  ["/app/registro-de-actividad", "/app/registro-de-actividad/sesiones"],
  // Un solo ítem de menú (actividades) para todas las vistas del Planeador.
  ["/app/planeador/unidades", "/app/planeador/actividades"],
  ["/app/planeador/planilla", "/app/planeador/actividades"],
  ["/app/planeador/recursos", "/app/planeador/actividades"],
]

/** Sin query, hash ni barras finales. */
function normalizePath(path: string): string {
  const withoutQuery = path.split(/[?#]/, 1)[0].trim()
  const trimmed = withoutQuery.replace(/\/+$/, "")
  return trimmed === "" ? "/" : trimmed
}

/** `pathname` es `base` o cuelga de él (con límite de segmento). */
export function isUnder(pathname: string, base: string): boolean {
  const path = normalizePath(pathname)
  const prefix = normalizePath(base)
  return path === prefix || path.startsWith(`${prefix}/`)
}

export function resolveNavPathname(pathname: string): string {
  const alias = NAV_PATH_ALIASES.find(([from]) => isUnder(pathname, from))
  return alias ? alias[1] : pathname
}

/** URLs de ítems y sub-ítems; `/` y `/app` se descartan porque abrirían todo. */
export function getMenuUrls(items: readonly MenuUrlSource[]): string[] {
  const urls = items.flatMap((item) => [item.url, ...(item.items ?? []).map((sub) => sub.url)])
  return urls
    .filter((url): url is string => typeof url === "string" && url.trim() !== "")
    .map(normalizePath)
    .filter((url) => url !== "/" && url !== "/app")
}

export function isAlwaysAllowedPath(pathname: string): boolean {
  const path = normalizePath(pathname)
  return ALWAYS_ALLOWED_PATHS.includes(path)
}

/** Se prueba la ruta y su alias, por si el alias también es un ítem propio. */
export function canAccessPath(pathname: string, menuUrls: readonly string[]): boolean {
  if (isAlwaysAllowedPath(pathname)) return true

  const aliased = resolveNavPathname(pathname)
  return menuUrls.some((url) => isUnder(pathname, url) || isUnder(aliased, url))
}

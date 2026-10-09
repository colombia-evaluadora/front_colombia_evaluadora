/**
 * ¿Qué rutas de `/app` puede abrir el usuario? La respuesta sale del MISMO
 * menú que pinta el sidebar (`GET /eval-col/my-menus`, ver
 * `use-nav-items-query.ts`): si un módulo no está en tu menú, tampoco se abre
 * escribiendo su URL a mano (bug de QA: un Rector entraba a
 * `/app/administracion/roles-menus`). El backend ya niega los datos; esto
 * evita pintar la pantalla vacía o a medio romper.
 *
 * Es el único lugar que sabe a qué ítem del menú pertenece cada ruta. Lo usan
 * el guard de `/app` (`router.tsx`), el ítem activo del sidebar
 * (`nav-main.tsx`) y las migas (`app-breadcrumb.tsx`), para que "esta ruta es
 * de tal menú" no pueda divergir entre ellos.
 *
 * Funciones puras y sin React: se testean en `route-access.test.ts`.
 */

/** Lo único que este módulo necesita de un ítem del menú (`NavItem`). */
export interface MenuUrlSource {
  url: string
  items?: { url: string }[]
}

/**
 * Pantallas de `/app` que no son de ningún módulo y que cualquier usuario con
 * sesión puede abrir:
 *
 * - `/app`: no tiene página, solo redirige al primer ítem del menú.
 * - `/app/sin-acceso`: es justamente a donde manda el guard. Si dependiera
 *   del menú, un usuario sin acceso rebotaría contra ella en bucle.
 */
export const ALWAYS_ALLOWED_PATHS: readonly string[] = ["/app", "/app/sin-acceso"]

/**
 * Rutas que NO cuelgan de la URL del ítem del menú al que pertenecen, con la
 * URL de ese ítem. El resto de las pantallas no necesita entrada acá: las
 * subpáginas (detalle, agregar, editar) viven debajo de la URL de su ítem
 * (`/app/cobertura/matricula/detalle/5` es de `/app/cobertura/matricula`) y
 * las resuelve `isUnder`.
 *
 * Cada `from` es un prefijo con límite de segmento: cubre la ruta y todo lo
 * que cuelgue de ella.
 *
 * Al agregar una ruta que no viva bajo la URL de su ítem del menú, sumala
 * acá; si no, el guard la bloquea para todos (falla cerrado) y el test de
 * `route-access.test.ts` que recorre el router lo avisa.
 */
export const NAV_PATH_ALIASES: ReadonlyArray<readonly [from: string, to: string]> = [
  // Agregar y editar establecimiento viven **al lado** de la lista
  // (`/agregar`, `/editar/$id` vs `/general`), no debajo.
  ["/app/establecimiento-educativo/agregar", "/app/establecimiento-educativo/general"],
  ["/app/establecimiento-educativo/editar", "/app/establecimiento-educativo/general"],
  // El registro de actividad tiene dos vistas hermanas (`/sesiones` y
  // `/tablas`) pero un solo ítem de menú, que apunta a la de sesiones: todo
  // lo que cuelgue del prefijo es de ese ítem, esté en la vista que esté.
  ["/app/registro-de-actividad", "/app/registro-de-actividad/sesiones"],
  // El Planeador tiene varias vistas hermanas (actividades, unidades,
  // planilla, vista previa de recurso) bajo el mismo prefijo `planeador`,
  // pero un solo ítem de menú, que apunta a actividades (ver el comentario
  // de `planeadorActividades` en `config/paths.ts`). Sin esto el ítem del
  // sidebar se apagaba al entrar a Unidades o Planilla (reportado en vivo) y,
  // ahora, el guard las bloquearía.
  ["/app/planeador/unidades", "/app/planeador/actividades"],
  ["/app/planeador/planilla", "/app/planeador/actividades"],
  ["/app/planeador/recursos", "/app/planeador/actividades"],
]

/**
 * Saca query/hash y las barras finales: `location.pathname` puede venir como
 * `/app/x/` en una entrada directa, y una URL de menú cargada a mano en la
 * pantalla de roles y menús puede traer `?algo`.
 */
function normalizePath(path: string): string {
  const withoutQuery = path.split(/[?#]/, 1)[0].trim()
  const trimmed = withoutQuery.replace(/\/+$/, "")
  return trimmed === "" ? "/" : trimmed
}

/**
 * ¿`pathname` es `base` o cuelga de él? No alcanza con `startsWith`: el `/`
 * del límite evita que `/app/cobertura` matchee a `/app/cobertura-x`.
 */
export function isUnder(pathname: string, base: string): boolean {
  const path = normalizePath(pathname)
  const prefix = normalizePath(base)
  return path === prefix || path.startsWith(`${prefix}/`)
}

/**
 * URL del ítem de menú al que pertenece `pathname` si es una de las rutas de
 * `NAV_PATH_ALIASES`; si no, el mismo `pathname`.
 */
export function resolveNavPathname(pathname: string): string {
  const alias = NAV_PATH_ALIASES.find(([from]) => isUnder(pathname, from))
  return alias ? alias[1] : pathname
}

/**
 * URLs que otorgan acceso: las de todos los ítems y sub-ítems del menú.
 *
 * Se descartan `/` y `/app` aunque el backend las traiga: como todo se
 * compara por prefijo, una sola fila de menú cargada así (p. ej. un grupo con
 * la raíz como URL) abriría TODOS los módulos. Ninguna pantalla real vive
 * ahí, así que no se pierde nada.
 */
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

/**
 * ¿El usuario con este menú puede abrir `pathname`? Sí si:
 *
 * - es una de las `ALWAYS_ALLOWED_PATHS`, o
 * - es la URL de un ítem de su menú o cuelga de ella, o
 * - es una ruta de `NAV_PATH_ALIASES` cuyo ítem dueño está en su menú.
 *
 * Se prueba el path tal cual Y su alias: si algún entorno tuviera, p. ej.,
 * Unidades como ítem propio (`/app/planeador/unidades`), el alias no le quita
 * el acceso directo.
 */
export function canAccessPath(pathname: string, menuUrls: readonly string[]): boolean {
  if (isAlwaysAllowedPath(pathname)) return true

  const aliased = resolveNavPathname(pathname)
  return menuUrls.some((url) => isUnder(pathname, url) || isUnder(aliased, url))
}

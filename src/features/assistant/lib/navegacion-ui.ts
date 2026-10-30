import { rutaDelCatalogo, type RutaCatalogo } from "@/features/assistant/lib/catalogo-rutas"
import type { MenuPermission } from "@/features/navigation/api/types/menu-permission"

// Validación de NAVEGAR hacia una subruta del catálogo (`catalogo-rutas.ts`)
// ANTES de navegar. El backend ya validó lo mismo (menú visible, params,
// search admitidos), pero el front vuelve a comprobarlo con lo que solo él
// tiene: el router real (que la ruta exista y su `validateSearch` zod) y los
// permisos CRUD del menú (`/usuarios/permisos-menu`).

/** Un id de la URL: dígitos, letras, `-` y `_` (también `-1` = periodo Final). */
const VALOR_PARAM = /^[A-Za-z0-9_-]{1,64}$/

export interface DestinoNavegacion {
  /** Patrón del router (`/app/.../$id`). */
  to: string
  params: Record<string, string>
  search: Record<string, unknown>
}

export type ResultadoNavegacion = { ok: true; destino: DestinoNavegacion } | { ok: false; motivo: string }

/** Lo que se usa de una ruta del router: su `validateSearch` (schema zod o función). */
export interface RutaRouter {
  options: { validateSearch?: unknown }
}

export interface EntornoNavegacion {
  /** Ruta del router por patrón completo (`router.routesByPath`). */
  rutaDelRouter: (patron: string) => RutaRouter | undefined
  /** Permisos del usuario por menú; `undefined` si aún no cargaron. */
  permisos: MenuPermission[] | undefined
}

function escaparRegex(texto: string) {
  return texto.replace(/[.*+?^{}()|[\]\\]/g, "\\$&")
}

/** Extrae los `$params` de una URL concreta según el patrón; `null` si no corresponde. */
export function extraerParams(patron: string, url: string): Record<string, string> | null {
  const nombres: string[] = []
  const regex = new RegExp(
    "^" +
      patron
        .split("/")
        .map((segmento) => {
          if (!segmento.startsWith("$")) return escaparRegex(segmento)
          nombres.push(segmento.slice(1))
          return "([^/]+)"
        })
        .join("/") +
      "/?$",
  )
  const match = regex.exec(url)
  if (!match) return null
  const params: Record<string, string> = {}
  nombres.forEach((nombre, i) => {
    params[nombre] = decodeURIComponent(match[i + 1] ?? "")
  })
  return params
}

function permitido(ruta: RutaCatalogo, permisos: MenuPermission[] | undefined): string | null {
  if (!permisos) return "Todavía no se cargaron tus permisos; intenta de nuevo en un momento."
  const menu = permisos.find((p) => p.codigo === ruta.menu)
  if (!menu?.puede_ver) return "No tienes acceso a esa pantalla."
  if (ruta.accion === "crear" && !menu.puede_crear) return "No tienes permiso para crear en esa pantalla."
  if (ruta.accion === "editar" && !menu.puede_editar) return "No tienes permiso para editar en esa pantalla."
  return null
}

/** Pasa el search por el `validateSearch` real de la ruta; devuelve las claves que no sobrevivieron. */
function validarSearch(
  ruta: RutaRouter,
  search: Record<string, unknown>,
): { search: Record<string, unknown>; invalidas: string[] } {
  const validador = ruta.options.validateSearch as
    | { safeParse?: (v: unknown) => { success: boolean; data?: unknown } }
    | ((v: unknown) => unknown)
    | undefined
  if (!validador || Object.keys(search).length === 0) return { search, invalidas: [] }
  let salida: Record<string, unknown> | undefined
  try {
    if (typeof validador === "function") salida = validador(search) as Record<string, unknown>
    else if (typeof validador.safeParse === "function") {
      const r = validador.safeParse(search)
      salida = r.success ? (r.data as Record<string, unknown>) : undefined
    }
  } catch {
    salida = undefined
  }
  if (!salida) return { search: {}, invalidas: Object.keys(search) }
  // Los schemas usan `.catch(undefined)`: un valor inválido no tira, desaparece.
  const invalidas = Object.keys(search).filter((k) => salida[k] === undefined)
  const limpio = Object.fromEntries(Object.keys(search).filter((k) => salida[k] !== undefined).map((k) => [k, salida[k]]))
  return { search: limpio, invalidas }
}

/**
 * Valida un NAVEGAR a una subruta del catálogo y arma el destino tipado para
 * `navigate({ to, params, search })`.
 */
export function validarNavegacionSubruta(
  accion: { subruta: string; url: string; params?: Record<string, string> },
  entorno: EntornoNavegacion,
): ResultadoNavegacion {
  const ruta = rutaDelCatalogo(accion.subruta)
  if (!ruta) return { ok: false, motivo: "Esa pantalla no está en el catálogo de rutas." }
  const sinPermiso = permitido(ruta, entorno.permisos)
  if (sinPermiso) return { ok: false, motivo: sinPermiso }
  const delRouter = entorno.rutaDelRouter(ruta.ruta)
  if (!delRouter) return { ok: false, motivo: "La pantalla no existe en esta versión de la aplicación." }

  const [camino] = accion.url.split("?")
  const params = extraerParams(ruta.ruta, camino ?? "")
  if (!params) return { ok: false, motivo: "La dirección no corresponde a la pantalla indicada." }
  const faltantes = Object.keys(ruta.params ?? {}).filter((p) => !params[p])
  if (faltantes.length > 0) return { ok: false, motivo: `Falta el dato ${faltantes.join(", ")} para abrir la pantalla.` }
  const malos = Object.entries(params).filter(([, v]) => !VALOR_PARAM.test(v))
  if (malos.length > 0) return { ok: false, motivo: "Un identificador de la dirección no es válido." }

  const admitidos = new Set(Object.keys(ruta.search ?? {}))
  const pedido = Object.fromEntries(Object.entries(accion.params ?? {}).filter(([k]) => admitidos.has(k)))
  const { search, invalidas } = validarSearch(delRouter, pedido)
  if (invalidas.length > 0) return { ok: false, motivo: `Valor no válido para ${invalidas.join(", ")}.` }

  return { ok: true, destino: { to: ruta.ruta, params, search } }
}

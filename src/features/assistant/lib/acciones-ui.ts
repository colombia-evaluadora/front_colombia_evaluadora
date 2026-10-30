import type { AccionUi } from "@/features/assistant/api/types"
import { rutaDelCatalogo } from "@/features/assistant/lib/catalogo-rutas"
import {
  filtrosRegistrados,
  formularioRegistrado,
  motivoFormularioBloqueado,
  pestanasRegistradas,
} from "@/features/assistant/lib/registro-ui"

const OPS_CONOCIDAS = new Set<AccionUi["op"]>([
  "NAVEGAR",
  "RELLENAR",
  "LIMPIAR_CAMPO",
  "RESALTAR",
  "ABRIR_PESTANA",
  "APLICAR_FILTROS",
])

/** Claves que no son filtros aunque vivan en la URL de un listado. */
const CLAVES_NO_FILTRO = new Set(["page", "pageSize", "sortBy", "sortDir"])

/** Nombres de filtro del listado abierto: los registrados o, si no hay, los de la URL. */
export function filtrosDisponibles(search: Record<string, unknown>): string[] {
  const registrados = filtrosRegistrados()
  if (registrados) return registrados.nombres
  return Object.keys(search).filter((clave) => !CLAVES_NO_FILTRO.has(clave))
}

/**
 * Solo rutas internas de la app (`/app/...`). La URL viene del registro de
 * menús del backend, no del modelo, pero igual se descarta cualquier cosa que
 * pueda sacar a la persona del sitio (`//host`, `javascript:`, absolutas).
 */
export function esRutaInterna(url: string): boolean {
  return /^\/app(\/|$|\?)/.test(url) && !url.startsWith("//")
}

export function esAccionConocida(accion: unknown): accion is AccionUi {
  return (
    accion != null &&
    typeof accion === "object" &&
    OPS_CONOCIDAS.has((accion as { op?: AccionUi["op"] }).op as AccionUi["op"])
  )
}

export interface ResultadoAccion {
  accion: AccionUi
  aplicada: boolean
  motivo?: string
}

export interface EntornoAcciones {
  navegar: (url: string, params: Record<string, string>) => void
  /**
   * NAVEGAR a una subruta del catálogo (agregar, editar/$id, detalle/$id…):
   * valida contra el router y los permisos y navega. Devuelve el motivo si no
   * se pudo, `null` si navegó. Sin esto, una subruta no se aplica.
   */
  navegarSubruta?: (accion: { subruta: string; url: string; params?: Record<string, string> }) => string | null
  /** Filtros por URL cuando la pantalla no registró los suyos. */
  aplicarFiltrosUrl: (filtros: Record<string, unknown>) => void
  filtrosDeLaPantalla: string[]
}

/** Aplica las acciones en orden y devuelve qué se pudo hacer (para mostrarlo en el chat). */
export function aplicarAcciones(acciones: unknown[], entorno: EntornoAcciones): ResultadoAccion[] {
  const resultados: ResultadoAccion[] = []
  for (const accion of acciones) {
    if (!esAccionConocida(accion)) continue
    resultados.push(aplicarUna(accion, entorno))
  }
  return resultados
}

function aplicarUna(accion: AccionUi, entorno: EntornoAcciones): ResultadoAccion {
  switch (accion.op) {
    case "NAVEGAR": {
      if (!esRutaInterna(accion.url)) return { accion, aplicada: false, motivo: "Ruta no permitida." }
      if (accion.subruta) {
        if (!entorno.navegarSubruta) return { accion, aplicada: false, motivo: "Ruta no permitida." }
        const motivo = entorno.navegarSubruta({ subruta: accion.subruta, url: accion.url, params: accion.params })
        return motivo ? { accion, aplicada: false, motivo } : { accion, aplicada: true }
      }
      entorno.navegar(accion.url, accion.params ?? {})
      return { accion, aplicada: true }
    }
    case "RELLENAR":
    case "LIMPIAR_CAMPO":
    case "RESALTAR": {
      const formulario = formularioRegistrado(accion.formulario)
      if (!formulario) {
        const bloqueo = motivoFormularioBloqueado(accion.formulario)
        return { accion, aplicada: false, motivo: bloqueo ?? "El formulario no está abierto en esta pantalla." }
      }
      if (accion.op === "RELLENAR") formulario.rellenar(accion.valores ?? {})
      else if (accion.op === "LIMPIAR_CAMPO") formulario.limpiar(accion.campo)
      else formulario.resaltar(accion.campo)
      return { accion, aplicada: true }
    }
    case "ABRIR_PESTANA": {
      const pestanas = pestanasRegistradas()
      const abierta = pestanas?.abrir(accion.pestana) ?? false
      return abierta ? { accion, aplicada: true } : { accion, aplicada: false, motivo: "La pestaña no existe aquí." }
    }
    case "APLICAR_FILTROS": {
      const permitidos = new Set(entorno.filtrosDeLaPantalla)
      const filtros = Object.fromEntries(
        Object.entries(accion.filtros ?? {}).filter(([nombre]) => permitidos.has(nombre)),
      )
      if (Object.keys(filtros).length === 0) {
        return { accion, aplicada: false, motivo: "Esta pantalla no tiene esos filtros." }
      }
      const registrados = filtrosRegistrados()
      if (registrados) registrados.aplicar(filtros)
      else entorno.aplicarFiltrosUrl(filtros)
      return { accion, aplicada: true }
    }
  }
}

/** Texto corto de una acción para el chat. */
export function describirAccion(accion: AccionUi): string {
  switch (accion.op) {
    case "NAVEGAR":
      if (accion.subruta) {
        const destino = rutaDelCatalogo(accion.subruta)?.descripcion
        if (destino) return `Ir a: ${destino.replace(/\.$/, "")}`
      }
      return `Ir a ${accion.pantalla.replace(/_/g, " ")}`
    case "RELLENAR":
      return `Rellenar ${Object.keys(accion.valores ?? {}).length} campo(s) del formulario`
    case "LIMPIAR_CAMPO":
      return `Limpiar el campo ${accion.campo}`
    case "RESALTAR":
      return `Revisar el campo ${accion.campo}`
    case "ABRIR_PESTANA":
      return `Abrir la pestaña ${accion.pestana}`
    case "APLICAR_FILTROS":
      return `Aplicar filtros: ${Object.entries(accion.filtros ?? {})
        .map(([k, v]) => `${k} = ${String(v)}`)
        .join(", ")}`
  }
}

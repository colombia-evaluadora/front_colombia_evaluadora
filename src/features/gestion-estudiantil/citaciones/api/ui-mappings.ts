import { paths } from "@/config/paths"
import type { BadgeColor } from "@/features/gestion-estudiantil/commons/utils/badge-color"
import type {
  CitacionRow,
  CompromisoRow,
  EstadoCitacionCodigo,
  EstadoCompromisoCodigo,
  OrigenCitacionTipo,
  OrigenCompromisoTipo,
} from "@/features/gestion-estudiantil/citaciones/api/types"

/** Color del badge de Estado de la citación (G.3.CIT.1). */
export const COLOR_ESTADO_CITACION: Record<EstadoCitacionCodigo, BadgeColor> = {
  POR_PROGRAMAR: "warning",
  PROGRAMADA: "muted",
  CONFIRMADA: "info",
  REALIZADA: "success",
  ASISTIO: "success",
  NO_ASISTIO: "destructive",
  CANCELADA: "muted",
}

/** Color del badge de Estado del compromiso (G.3.CMP.1). */
export const COLOR_ESTADO_COMPROMISO: Record<EstadoCompromisoCodigo, BadgeColor> = {
  PENDIENTE_ACEPTACION: "warning",
  VIGENTE: "success",
  CUMPLIDO: "success",
  INCUMPLIDO: "destructive",
}

const ORIGEN_CITACION: Record<OrigenCitacionTipo | OrigenCompromisoTipo, string> = {
  ANOTACION: "Anotación",
  CASO_CONVIVENCIA: "Caso de convivencia",
  PROCESO_DISCIPLINARIO: "Proceso disciplinario",
  SENAL_SALUD_MENTAL: "Señal de salud mental",
  PLAN_ACOMPANAMIENTO: "Plan de acompañamiento",
  CITACION: "Citación",
}

export interface OrigenEnlace {
  /** «Caso de convivencia #14». */
  texto: string
  /** Pantalla de detalle del origen; null si el front aún no la tiene (se muestra como texto). */
  href: string | null
}

/** Texto y destino del «Registro de origen» (solo lectura, §4.1): enlaza a donde ya hay detalle. */
export function origenEnlace(
  tipo: OrigenCitacionTipo | OrigenCompromisoTipo | null,
  id: number | null,
): OrigenEnlace | null {
  if (!tipo || id == null) return null
  const href =
    tipo === "CASO_CONVIVENCIA"
      ? paths.app.convivenciaCaso.getHref(id)
      : tipo === "PROCESO_DISCIPLINARIO"
        ? paths.app.convivenciaProceso.getHref(id)
        : null
  return { texto: `${ORIGEN_CITACION[tipo]} #${id}`, href }
}

/** Orígenes de sistema en los que una inasistencia se puede reprogramar (Regla 25). */
const ORIGENES_REPROGRAMA_INASISTENCIA: ReadonlyArray<OrigenCitacionTipo | null> = [
  "CASO_CONVIVENCIA",
  "SENAL_SALUD_MENTAL",
  "PROCESO_DISCIPLINARIO",
]

export interface PermisosCitaciones {
  puedeCrear: boolean
  puedeEditar: boolean
}

export interface AccionesCitacion {
  programar: boolean
  reprogramar: boolean
  cancelar: boolean
  asistencia: boolean
  crearCompromiso: boolean
}

/**
 * Qué acciones ofrece una citación según §12.4. El backend no manda banderas `puede_*`: se deducen
 * del estado, el origen y la fecha, y el gate de cada función vuelve a validar quién actúa
 * (quien atiende, quien gestiona el origen, Supervisor/Administrador del alcance).
 */
export function accionesCitacion(c: CitacionRow, permisos: PermisosCitaciones, ahora = Date.now()): AccionesCitacion {
  const estado = c.estado_valor
  const yaPaso = c.fecha_programada != null && new Date(c.fecha_programada).getTime() <= ahora
  const e = permisos.puedeEditar
  return {
    programar: e && estado === "POR_PROGRAMAR",
    reprogramar:
      e &&
      (estado === "PROGRAMADA" ||
        estado === "CONFIRMADA" ||
        (estado === "NO_ASISTIO" && ORIGENES_REPROGRAMA_INASISTENCIA.includes(c.origen_tipo))),
    cancelar: e && (estado === "POR_PROGRAMAR" || estado === "PROGRAMADA" || estado === "CONFIRMADA"),
    // Solo quien atiende registra la asistencia, y después de la fecha y hora.
    asistencia: e && c.es_propia && (estado === "PROGRAMADA" || estado === "CONFIRMADA") && yaPaso,
    crearCompromiso: permisos.puedeCrear && estado === "ASISTIO",
  }
}

export interface AccionesCompromiso {
  verDetalle: boolean
  aceptacionPresencial: boolean
  registrarResultado: boolean
}

/** Acciones del compromiso según la Regla 26: la aceptación pide Pendiente; el resultado, Vigente y ser su autor. */
export function accionesCompromiso(c: CompromisoRow, permisos: PermisosCitaciones): AccionesCompromiso {
  return {
    verDetalle: true,
    aceptacionPresencial: permisos.puedeEditar && c.estado_valor === "PENDIENTE_ACEPTACION",
    registrarResultado: permisos.puedeEditar && c.es_propio && c.estado_valor === "VIGENTE",
  }
}

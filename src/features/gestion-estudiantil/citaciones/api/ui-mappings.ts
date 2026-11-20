import { paths } from "@/config/paths"
import type { BadgeColor } from "@/features/gestion-estudiantil/commons/utils/badge-color"
import type {
  CitacionRow,
  CompromisoDetalle,
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

export interface AccionesCitacion {
  programar: boolean
  reprogramar: boolean
  cancelar: boolean
  asistencia: boolean
  crearCompromiso: boolean
  documento: boolean
}

/** Acciones de la citación: las banderas `puede_*` del back (estado y gate de cada POST); el front no las deduce. */
export function accionesCitacion(c: CitacionRow): AccionesCitacion {
  return {
    programar: c.puede_programar,
    reprogramar: c.puede_reprogramar,
    cancelar: c.puede_cancelar,
    asistencia: c.puede_registrar_asistencia,
    crearCompromiso: c.puede_crear_compromiso,
    documento: c.puede_documento,
  }
}

export interface AccionesCompromiso {
  verDetalle: boolean
  aceptacionPresencial: boolean
  registrarResultado: boolean
  documento: boolean
}

/** Acciones del compromiso: las banderas `puede_*` del back; ver el detalle solo pide que la fila sea visible. */
export function accionesCompromiso(c: CompromisoRow | CompromisoDetalle): AccionesCompromiso {
  return {
    verDetalle: true,
    aceptacionPresencial: c.puede_aceptacion_presencial,
    registrarResultado: c.puede_registrar_resultado,
    documento: c.puede_documento,
  }
}

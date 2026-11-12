import { format } from "date-fns"

import type {
  DestinatarioObservacion,
  ResumenObservacion,
} from "@/features/gestion-estudiantil/observaciones/api/types"

// Formulario de Observación (§8). Las reglas repiten las del backend (V634) con sus mensajes exactos para
// marcar el campo antes de enviar; el 22023 del servidor sigue siendo la última palabra.

export const TITULO_MAX = 100
export const OBSERVACION_MIN = 5
export const OBSERVACION_MAX = 1000
export const MOTIVO_ANULACION_MAX = 500

export const MSG_SIN_ESTUDIANTES = "Seleccione al menos un estudiante."
export const MSG_OBSERVACION_MIN = "La observación debe tener mínimo 5 caracteres."
export const MSG_OBSERVACION_MAX = "La observación no puede superar 1000 caracteres."
export const MSG_FECHA_SIN_PERIODO =
  "La fecha seleccionada no pertenece a un Período de Evaluación disponible para el estudiante."
export const MSG_SIN_DISPONIBLES =
  "No hay estudiantes disponibles para los Grados/Grupos seleccionados dentro de su alcance."

export interface ValoresObservacion {
  /** null = sin tocar: vale el valor por defecto (el único grupo que dirige, si es uno). */
  grupos: number[] | null
  destinatario: DestinatarioObservacion
  estudiantes: number[]
  fecha: Date | undefined
  titulo: string
  observacion: string
}

export type ErroresObservacion = Partial<Record<"grupos" | "estudiantes" | "fecha" | "titulo" | "observacion", string>>

export function errorObservacion(texto: string): string | undefined {
  const n = texto.trim().length
  if (n < OBSERVACION_MIN) return MSG_OBSERVACION_MIN
  if (n > OBSERVACION_MAX) return MSG_OBSERVACION_MAX
  return undefined
}

/**
 * Error de la Fecha a partir del resumen del backend: la fecha debe caer en un Período de Evaluación de
 * cada grupo elegido, y ese período debe estar Calificable. `undefined` mientras no hay resumen.
 */
export function errorPeriodo(resumen: ResumenObservacion[] | undefined): string | undefined {
  if (!resumen?.length) return undefined
  if (resumen.some((r) => r.fk_tperiodo_evaluacion == null)) return MSG_FECHA_SIN_PERIODO
  const cerrado = resumen.find((r) => !r.periodo_calificable)
  return cerrado ? `El Período de Evaluación ${cerrado.periodo_nombre} no está Calificable.` : undefined
}

/** «Período de Evaluación: Período 1.» bajo la Fecha; con varios grupos en períodos distintos, cada uno con su grupo. */
export function textoPeriodo(resumen: ResumenObservacion[] | undefined): string | undefined {
  const conPeriodo = (resumen ?? []).filter((r) => r.periodo_nombre)
  if (!conPeriodo.length) return undefined
  const nombres = [...new Set(conPeriodo.map((r) => r.periodo_nombre as string))]
  if (nombres.length === 1) return `Período de Evaluación: ${nombres[0]}.`
  return `Período de Evaluación: ${conPeriodo.map((r) => `${r.periodo_nombre} (${r.grado_grupo})`).join(", ")}.`
}

/** «Esta observación se aplicará a [N] estudiantes de [Grupo].» (G.7.ACC.1), con todos los grupos elegidos. */
/** «2 estudiantes de 6°A»: la parte que G.7.ACC.1 resalta en negrita. */
export function destinoConfirmacion(resumen: ResumenObservacion[]): string {
  const total = resumen.reduce((n, r) => n + r.estudiantes, 0)
  const grupos = resumen.map((r) => r.grado_grupo)
  const lista = grupos.length > 1 ? `${grupos.slice(0, -1).join(", ")} y ${grupos[grupos.length - 1]}` : (grupos[0] ?? "")
  return `${total} ${total === 1 ? "estudiante" : "estudiantes"} de ${lista}`
}

export function textoConfirmacion(resumen: ResumenObservacion[]): string {
  return `Esta observación se aplicará a ${destinoConfirmacion(resumen)}.`
}

export function validarObservacion(
  v: ValoresObservacion,
  opciones: { eligeDestino: boolean; gruposEfectivos: number[]; resumen: ResumenObservacion[] | undefined },
): ErroresObservacion {
  const e: ErroresObservacion = {}
  if (opciones.eligeDestino) {
    if (opciones.gruposEfectivos.length === 0) e.grupos = "Seleccione al menos un Grado/Grupo."
    if (v.destinatario === "ESTUDIANTES_ESPECIFICOS" && v.estudiantes.length === 0) e.estudiantes = MSG_SIN_ESTUDIANTES
    else if (v.destinatario === "TODO_EL_GRUPO" && opciones.resumen?.some((r) => r.estudiantes === 0))
      e.estudiantes = MSG_SIN_DISPONIBLES
  }
  if (!v.fecha) e.fecha = "La fecha es obligatoria."
  else {
    const periodo = errorPeriodo(opciones.resumen)
    if (periodo) e.fecha = periodo
  }
  if (v.titulo.trim().length > TITULO_MAX) e.titulo = "El título no puede superar 100 caracteres."
  const observacion = errorObservacion(v.observacion)
  if (observacion) e.observacion = observacion
  return e
}

export const hayErroresObservacion = (e: ErroresObservacion) => Object.keys(e).length > 0

/** `Date` del formulario → `aaaa-mm-dd` que espera el backend. */
export const fechaParaBackend = (fecha: Date) => format(fecha, "yyyy-MM-dd")

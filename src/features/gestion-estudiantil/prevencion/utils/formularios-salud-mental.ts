import { format } from "date-fns"

import { errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"

// Formularios de Salud mental (§9.6). Repiten las reglas del backend para marcar el campo antes de enviar;
// el 400 del servidor sigue siendo la última palabra.

export const OBSERVADO_MIN = 10
export const OBSERVADO_MAX = 500
export const NOTAS_MIN = 10
export const NOTAS_MAX = 2000
export const ACCION_MIN = 10
export const ACCION_MAX = 1000

const iso = (fecha: Date) => format(fecha, "yyyy-MM-dd")

export interface ValoresReporte {
  estudiante: string
  fecha: Date | undefined
  tipo: string
  observado: string
}
export type ErroresReporte = Partial<Record<keyof ValoresReporte, string>>

export function validarReporte(v: ValoresReporte, ahora = new Date()): ErroresReporte {
  const e: ErroresReporte = {}
  if (!v.estudiante) e.estudiante = "El estudiante es obligatorio."
  if (!v.fecha) e.fecha = "La fecha es obligatoria."
  else if (iso(v.fecha) > iso(ahora)) e.fecha = "La fecha no puede ser posterior a hoy."
  if (!v.tipo) e.tipo = "El tipo de señal es obligatorio."
  const o = errorLargo(v.observado, OBSERVADO_MIN, OBSERVADO_MAX, "Lo observado")
  if (o) e.observado = o
  return e
}

export interface ValoresValoracionSM {
  severidad: string
  notas: string
}
export type ErroresValoracionSM = Partial<Record<keyof ValoresValoracionSM, string>>

export function validarValoracionSM(v: ValoresValoracionSM): ErroresValoracionSM {
  const e: ErroresValoracionSM = {}
  if (!v.severidad) e.severidad = "La severidad es obligatoria."
  const n = errorLargo(v.notas, NOTAS_MIN, NOTAS_MAX, "Las notas de valoración")
  if (n) e.notas = n
  return e
}

export interface ValoresAtencion {
  accion: string
  fecha: Date | undefined
  entidad: string
}
export type ErroresAtencion = Partial<Record<keyof ValoresAtencion, string>>

/** @param fechaSenal `aaaa-mm-dd` de la señal: la atención no puede ser anterior. */
export function validarAtencion(v: ValoresAtencion, fechaSenal: string, ahora = new Date()): ErroresAtencion {
  const e: ErroresAtencion = {}
  const a = errorLargo(v.accion, ACCION_MIN, ACCION_MAX, "La acción realizada")
  if (a) e.accion = a
  if (!v.fecha) e.fecha = "La fecha es obligatoria."
  else if (iso(v.fecha) > iso(ahora)) e.fecha = "La fecha no puede ser posterior a hoy."
  else if (iso(v.fecha) < fechaSenal.slice(0, 10)) e.fecha = "La fecha no puede ser anterior a la de la señal."
  return e
}

export const esSeveridadCritica = (codigo: string | undefined) => codigo === "CRITICO" || codigo === "VITAL"

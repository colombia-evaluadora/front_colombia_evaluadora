import { format } from "date-fns"

import { errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { DESCRIPCION_MAX, DESCRIPCION_MIN } from "@/features/gestion-estudiantil/prevencion/utils/formularios"

// Formularios del seguimiento del plan (§9.3): avance, aceptación presencial y anulación. Repiten las reglas
// del backend para marcar el campo antes de enviar; el 22023 del servidor sigue siendo la última palabra.

export { DESCRIPCION_MAX }

export const MOTIVO_MAX = 1000
const SOPORTE_MAX_BYTES = 10 * 1024 * 1024

const iso = (fecha: Date) => format(fecha, "yyyy-MM-dd")

export interface ValoresAvance {
  accion: string
  fecha: Date | undefined
  descripcion: string
}

export type ErroresAvance = Partial<Record<keyof ValoresAvance, string>>

/** @param inicioPlan `aaaa-mm-dd`: el avance no puede ser anterior al inicio del plan ni posterior a hoy. */
export function validarAvance(v: ValoresAvance, inicioPlan: string | null, ahora = new Date()): ErroresAvance {
  const e: ErroresAvance = {}
  if (!v.accion) e.accion = "La acción es obligatoria."
  if (!v.fecha) e.fecha = "La fecha es obligatoria."
  else if (iso(v.fecha) > iso(ahora)) e.fecha = "La fecha no puede ser posterior a hoy."
  else if (inicioPlan && iso(v.fecha) < inicioPlan.slice(0, 10)) e.fecha = "La fecha no puede ser anterior al inicio del plan."
  const d = errorLargo(v.descripcion, DESCRIPCION_MIN, DESCRIPCION_MAX, "La descripción del avance")
  if (d) e.descripcion = d
  return e
}

export interface ValoresAceptacion {
  soporte: File | null
  fecha: Date | undefined
}

export type ErroresAceptacion = Partial<Record<keyof ValoresAceptacion, string>>

export function validarAceptacion(v: ValoresAceptacion, ahora = new Date()): ErroresAceptacion {
  const e: ErroresAceptacion = {}
  if (!v.soporte) e.soporte = "Cargue el soporte firmado para registrar la aceptación presencial."
  else if (v.soporte.size > SOPORTE_MAX_BYTES) e.soporte = "El soporte no puede superar 10 MB."
  if (!v.fecha) e.fecha = "La fecha de aceptación es obligatoria."
  else if (iso(v.fecha) > iso(ahora)) e.fecha = "La fecha no puede ser posterior a hoy."
  return e
}

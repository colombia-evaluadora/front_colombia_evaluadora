import { format } from "date-fns"

import { errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"
// Formulario de Reconocimiento (§7.1). Las reglas repiten las del backend (V627-V628) para marcar el
// campo antes de enviar; el 22023 del servidor sigue siendo la última palabra.

export const MOTIVO_MIN = 5
export const MOTIVO_MAX = 200
const MAX_BYTES_SOPORTE = 10 * 1024 * 1024

export interface ValoresReconocimiento {
  /** pk de matrícula como número; solo el modo «nuevo» elige varios. */
  estudiantes: number[]
  tipo: string
  motivo: string
  fecha: Date | undefined
  /** null = sin tocar: vale el valor por defecto (el usuario actual, o el que ya tenía). */
  otorgante: string | null
  actividad: string
  soporte: File | null
}

export type ErroresReconocimiento = Partial<Record<keyof ValoresReconocimiento, string>>

/** Fecha obligatoria y no posterior a hoy (el backend además exige un Período de Evaluación Calificable). */
export function errorFecha(fecha: Date | undefined, ahora = new Date()): string | undefined {
  if (!fecha) return "La fecha es obligatoria."
  const hoy = format(ahora, "yyyy-MM-dd")
  return format(fecha, "yyyy-MM-dd") > hoy ? "La fecha no puede ser posterior a hoy." : undefined
}

export function validarReconocimiento(
  v: ValoresReconocimiento,
  opciones: { eligeEstudiantes: boolean; otorganteEfectivo: string },
  ahora = new Date(),
): ErroresReconocimiento {
  const e: ErroresReconocimiento = {}
  if (opciones.eligeEstudiantes && v.estudiantes.length === 0) e.estudiantes = "Elija al menos un estudiante."
  if (!v.tipo) e.tipo = "El tipo de reconocimiento es obligatorio."
  const motivo = errorLargo(v.motivo, MOTIVO_MIN, MOTIVO_MAX, "El motivo")
  if (motivo) e.motivo = motivo
  const fecha = errorFecha(v.fecha, ahora)
  if (fecha) e.fecha = fecha
  if (!opciones.otorganteEfectivo) e.otorgante = "Indique quién otorga el reconocimiento."
  if (v.soporte && v.soporte.size > MAX_BYTES_SOPORTE) e.soporte = "El soporte no puede superar 10 MB."
  return e
}

export const hayErroresReconocimiento = (e: ErroresReconocimiento) => Object.keys(e).length > 0

/** `Date` del formulario → `aaaa-mm-dd` que espera el backend. */
export const fechaParaBackend = (fecha: Date) => format(fecha, "yyyy-MM-dd")

/**
 * Calificaciones de una actividad. Una fila por estudiante del grupo: la
 * asistencia a la fecha de la actividad y, si es evaluativa, las notas por
 * criterio de la rúbrica.
 *
 * El porcentaje final del estudiante es la suma de sus notas por criterio
 * ponderadas por `criterio.ponderacion` (que ya está en `Actividad.rubrica`).
 * Lo que la UI muestra en la columna NOTA es ese número; "Agregar" es el
 * placeholder cuando todavía no se cargó ninguna nota.
 */

import type { Criterio } from "@/features/planeador/api/types/actividad"

/** Estado posible de la asistencia a la fecha de la actividad. */
export type EstadoAsistencia = "asistio" | "llego-tarde" | "no-asistio"

export type Estudiante = {
  id: string
  nombres: string
  apellidos: string
}

export type Asistencia = {
  estado: EstadoAsistencia
  /** Texto libre cuando el estado es "llego-tarde" o "no-asistio". */
  justificacion?: string
  /** Adjuntos que justifican la inasistencia/llegada tarde (badge con el
   * conteo en la UI). */
  adjuntos: number
}

/** Nota del estudiante en un criterio específico. */
export type NotaCriterio = {
  criterioId: string
  /** 0-100. Sin nota hasta que se ingrese (undefined). */
  valor?: number
}

/** Calificación completa de un estudiante en una actividad. */
export type CalificacionEstudiante = Estudiante & {
  asistencia: Asistencia
  notas: NotaCriterio[]
}

/** Porcentaje final del estudiante: suma ponderada de sus notas por criterio.
 * Devuelve `null` si todavía no se cargó ninguna nota. */
export function porcentajeFinal(
  notas: NotaCriterio[],
  criterios: Criterio[],
): number | null {
  const totalPond = criterios.reduce((acc, c) => acc + c.ponderacion, 0)
  if (totalPond === 0) return null

  const filled = notas.filter((n) => typeof n.valor === "number")
  if (filled.length === 0) return null

  // Pondera solo los criterios con nota cargada (la ausencia de nota pesa 0).
  // Coincide con lo que muestra la tabla: si el docente no calificó un
  // criterio, ese criterio todavía no aporta al porcentaje.
  const suma = filled.reduce((acc, n) => {
    const c = criterios.find((c) => c.id === n.criterioId)
    if (!c) return acc
    return acc + ((n.valor ?? 0) * c.ponderacion) / 100
  }, 0)

  // Normaliza contra la suma de los pesos efectivamente calificados, no
  // contra el total — así, si solo se cargaron 2 de 3 criterios del 30%,
  // el 100% del estudiante refleja esos dos, no los tres.
  const sumaPond = filled.reduce((acc, n) => {
    const c = criterios.find((c) => c.id === n.criterioId)
    return c ? acc + c.ponderacion : acc
  }, 0)

  if (sumaPond === 0) return null
  return Math.round((suma * 100) / sumaPond)
}
import { format } from "date-fns"

import type { EvaluationPeriod } from "@/features/establishment/academic-period/api/types/evaluation-period"

/** Estado "NO Calificable" de `ESTADOPERIODOEVALUACION`. */
const ESTADO_NO_CALIFICABLE = "2"

/**
 * Misma regla que `fn_periodo_evaluacion_cerrado` del backend (V535): un
 * periodo de evaluación está CERRADO cuando es "NO Calificable" y su fecha
 * fin ya pasó. Uno futuro, o vencido pero todavía Calificable, sigue abierto.
 * El backend rechaza (23514) crear o mover actividades dentro de uno cerrado;
 * acá solo se usa para deshabilitar esos días en el calendario.
 */
export function esPeriodoCerrado(periodo: EvaluationPeriod, hoy: Date = new Date()): boolean {
  return periodo.estado === ESTADO_NO_CALIFICABLE && periodo.endDate < format(hoy, "yyyy-MM-dd")
}

export function periodosCerrados<T extends EvaluationPeriod>(periodos: T[], hoy: Date = new Date()): T[] {
  return periodos.filter((periodo) => esPeriodoCerrado(periodo, hoy))
}

/** `yyyy-MM-dd` → `Date` local (sin el corrimiento de zona de `new Date(iso)`). */
function toLocalDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function rangosDePeriodos(periodos: EvaluationPeriod[]): { from: Date; to: Date }[] {
  return periodos.map((periodo) => ({ from: toLocalDate(periodo.startDate), to: toLocalDate(periodo.endDate) }))
}

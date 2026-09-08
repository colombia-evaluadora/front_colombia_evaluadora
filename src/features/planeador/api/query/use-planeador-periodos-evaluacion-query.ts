import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { EvaluationPeriod } from "@/features/establishment/academic-period/api/types/evaluation-period"

/**
 * `GET /planeador/periodos-evaluacion` (confirmado real) — reemplaza a
 * `POST /periodo-evaluacion/query` como fuente del cuarto paso del filtro
 * de la Planilla ("Periodo de evaluación"): ese endpoint genérico responde
 * 403 para `CEVAL-DOCENTE` (`role_query` nunca lo incluyó); este, bajo el
 * propio módulo Planeador, sí es accesible al docente.
 *
 * Shape PROPIO, distinto del genérico `EvaluationPeriodListRow` —
 * confirmado contra la respuesta real: nombres de campo distintos
 * (`pk_tperiodo_evaluacion`, `fecha_inicio`/`fecha_fin` en vez de
 * `start_date`/`end_date`, `porcentaje` en vez de `peso`, `estado_valor`/
 * `estado_nombre` en vez de `estado`/`estado_name`) y, sobre todo, ya trae
 * `vigente_hoy` calculado del lado del backend — no hace falta repetir la
 * comparación de fechas `[startDate, endDate]` que hacía
 * `FiltroPlanillaCascada` contra el endpoint genérico.
 */
interface PlaneadorPeriodoEvaluacionRow {
  pk_tperiodo_evaluacion: number
  codigo: string
  nombre: string
  abreviacion: string
  // Datetime ISO completo ("2026-09-01T00:00:00.000Z"), no `yyyy-MM-dd`
  // plano — mismo patrón que el resto de fechas del Planeador real.
  fecha_inicio: string
  fecha_fin: string
  porcentaje: number
  vigente_hoy: boolean
  fk_tlv_estado: number
  estado_valor: string
  estado_nombre: string
  fk_tperiodo_academico: number
  periodo_academico: string
}

function toDateOnly(value: string): string {
  return value.slice(0, 10)
}

function toEvaluationPeriod(row: PlaneadorPeriodoEvaluacionRow): EvaluationPeriod {
  return {
    id: row.pk_tperiodo_evaluacion,
    codigo: row.codigo,
    nombre: row.nombre,
    abreviacion: row.abreviacion,
    startDate: toDateOnly(row.fecha_inicio),
    endDate: toDateOnly(row.fecha_fin),
    peso: row.porcentaje,
    estado: row.estado_valor as EvaluationPeriod["estado"],
    estadoId: row.fk_tlv_estado,
    estadoName: row.estado_nombre,
  }
}

/** Solo los que el backend ya marcó vigentes — único caso de uso de este
 *  hook hoy (la cuarta columna del filtro de la Planilla). */
async function fetchPeriodosEvaluacionVigentes(): Promise<EvaluationPeriod[]> {
  const rows = await evalCol.getRows<PlaneadorPeriodoEvaluacionRow>(
    "/planeador/periodos-evaluacion",
  )
  return rows.filter((row) => row.vigente_hoy).map(toEvaluationPeriod)
}

export const planeadorPeriodosEvaluacionQueryKey = () =>
  ["planeador", "periodos-evaluacion"] as const

export function usePlaneadorPeriodosEvaluacionQuery() {
  return useQuery({
    queryKey: planeadorPeriodosEvaluacionQueryKey(),
    queryFn: fetchPeriodosEvaluacionVigentes,
    staleTime: 1000 * 60,
  })
}

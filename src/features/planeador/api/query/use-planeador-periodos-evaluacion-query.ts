import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { EvaluationPeriod } from "@/features/establishment/academic-period/api/types/evaluation-period"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

interface PlaneadorPeriodoEvaluacionRow {
  pk_tperiodo_evaluacion: number
  codigo: string
  nombre: string
  abreviacion: string
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

/** Todos los periodos del año, por fecha de inicio (cuarta columna del
 *  filtro de la Planilla). */
async function fetchPeriodosEvaluacion(): Promise<EvaluationPeriod[]> {
  const rows = await evalCol.getRows<PlaneadorPeriodoEvaluacionRow>(
    "/planeador/periodos-evaluacion",
  )
  return rows
    .map(toEvaluationPeriod)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
}

export function usePlaneadorPeriodosEvaluacionQuery() {
  return useQuery({
    queryKey: planeadorKeys.periodosEvaluacion(),
    queryFn: fetchPeriodosEvaluacion,
    staleTime: 1000 * 60,
  })
}

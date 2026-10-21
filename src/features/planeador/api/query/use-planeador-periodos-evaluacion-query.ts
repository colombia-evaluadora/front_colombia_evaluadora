import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { EvaluationPeriod } from "@/features/establishment/academic-period/api/types/evaluation-period"
import { planeadorKeys } from "@/features/planeador/api/query-keys"
import { proveedorMeta } from "@/lib/offline/query-meta"

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

/** El periodo académico al que pertenece hace falta para cruzarlo con la
 *  `programacion` del formulario de actividad (ver `lib/periodo-cerrado.ts`). */
export type PlaneadorPeriodoEvaluacion = EvaluationPeriod & { periodoAcademicoId: number }

function toEvaluationPeriod(row: PlaneadorPeriodoEvaluacionRow): PlaneadorPeriodoEvaluacion {
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
    periodoAcademicoId: row.fk_tperiodo_academico,
  }
}

/** Todos los periodos del año, por fecha de inicio (cuarta columna del
 *  filtro de la Planilla). */
export async function fetchPeriodosEvaluacion(): Promise<PlaneadorPeriodoEvaluacion[]> {
  const rows = await evalCol.getRows<PlaneadorPeriodoEvaluacionRow>(
    "/planeador/periodos-evaluacion",
  )
  return rows
    .map(toEvaluationPeriod)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
}

export function usePlaneadorPeriodosEvaluacionQuery() {
  return useQuery({
    // Proveedor de la Planilla y de "Preparar" (offline): sin `meta` acá, la
    // pantalla le borraba a la query el `meta` con el que se la preparó y
    // sus refetch dejaban de guardarse en el equipo.
    meta: proveedorMeta(),
    queryKey: planeadorKeys.periodosEvaluacion(),
    queryFn: fetchPeriodosEvaluacion,
    staleTime: 1000 * 60,
  })
}

import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { PeriodoInforme } from "@/features/academic-management/reports/api/types"

interface PeriodoRow {
  pk_tperiodo_evaluacion: number
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  termino: boolean
  en_curso: boolean
  calificable: boolean
  sede: string | null
  jornada: string | null
}

function toPeriodo(row: PeriodoRow): PeriodoInforme {
  return {
    id: row.pk_tperiodo_evaluacion,
    nombre: row.nombre,
    fechaInicio: row.fecha_inicio,
    fechaFin: row.fecha_fin,
    termino: row.termino,
    enCurso: row.en_curso,
    calificable: row.calificable,
    sede: row.sede,
    jornada: row.jornada,
  }
}

export interface PeriodosInformeParams {
  /** Número de año (2026), no una FK: `TANO_LECTIVO` es por establecimiento. */
  anio?: number
  establecimientoId?: number
  sedeId?: number
}

async function fetchPeriodos(params: PeriodosInformeParams): Promise<PeriodoInforme[]> {
  // Se omite la clave en vez de mandarla vacía: el binder rechaza `""`.
  const body: Record<string, number> = {}
  if (params.anio != null) body.ANIO = params.anio
  if (params.establecimientoId != null) body.FK_TESTABLECIMIENTO = params.establecimientoId
  if (params.sedeId != null) body.FK_TSEDE = params.sedeId

  const rows = await evalCol.postRows<PeriodoRow>("/informes/periodos", body)
  return rows.map(toPeriodo)
}

export const periodosInformeQueryKey = (params: PeriodosInformeParams) =>
  ["informes", "periodos", params] as const

/** `POST /informes/periodos`. Sin parámetros devuelve el año en curso
 *  dentro del alcance del usuario. */
export function usePeriodosInformeQuery(params: PeriodosInformeParams = {}) {
  return useQuery({
    queryKey: periodosInformeQueryKey(params),
    queryFn: () => fetchPeriodos(params),
    staleTime: 1000 * 60 * 5,
  })
}

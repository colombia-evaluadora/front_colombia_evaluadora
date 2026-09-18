import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { PeriodoInforme } from "@/features/academic-management/reports/api/types"

interface PeriodoRow {
  fk_tperiodo_evaluacion: number
  codigo: string | null
  nombre: string
  /** Acá se llama `abreviacion` a secas; en `/informes/grupo`, `/informes/historial`
   *  y las dos alertas la misma columna es `periodo_abreviacion`. */
  abreviacion: string | null
  fecha_inicio: string
  fecha_fin: string
  porcentaje: number | null
  estado: string | null
  termino: boolean
  en_curso: boolean
  calificable: boolean
  fk_tperiodo_academico: number
  periodo_academico: string | null
  fk_tsede: number
  sede_nombre: string | null
  fk_tlv_jornada: number
  jornada: string | null
  anio: number
}

function toPeriodo(row: PeriodoRow): PeriodoInforme {
  return {
    id: row.fk_tperiodo_evaluacion,
    nombre: row.nombre,
    abreviacion: row.abreviacion,
    fechaInicio: row.fecha_inicio,
    fechaFin: row.fecha_fin,
    termino: row.termino,
    enCurso: row.en_curso,
    calificable: row.calificable,
    sede: row.sede_nombre,
    jornada: row.jornada,
  }
}

export interface PeriodosInformeParams {
  sedeId: number | null
  /** Número de año (2026), no una FK: `TANO_LECTIVO` es por establecimiento. */
  anio: number | null
  jornadaId: number | null
}

export const periodosInformeQueryKey = (params: PeriodosInformeParams) =>
  ["informes", "periodos", params] as const

/** `POST /informes/periodos`. `FK_TSEDE` y `FK_TLV_JORNADA` son obligatorios
 *  desde el cambio de contrato: antes aceptaba `{}` y devolvía todo el año de
 *  todas las sedes del alcance, con nombres repetidos e indistinguibles. */
export function usePeriodosInformeQuery(params: PeriodosInformeParams) {
  return useQuery({
    queryKey: periodosInformeQueryKey(params),
    queryFn: async (): Promise<PeriodoInforme[]> => {
      const rows = await evalCol.postRows<PeriodoRow>("/informes/periodos", {
        FK_TSEDE: params.sedeId,
        ANIO: params.anio,
        FK_TLV_JORNADA: params.jornadaId,
      })
      return rows.map(toPeriodo)
    },
    enabled: params.sedeId != null && params.jornadaId != null,
    staleTime: 1000 * 60 * 5,
  })
}

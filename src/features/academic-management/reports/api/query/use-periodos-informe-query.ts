import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { PeriodoInforme } from "@/features/academic-management/reports/api/types"

interface PeriodoRow {
  /** El resto del módulo nombra esta columna `fk_tperiodo_evaluacion`
   *  (`/informes/grupo`); se aceptan las dos porque la doc no trae un ejemplo
   *  de respuesta de este endpoint y con la clave equivocada el id llega
   *  `undefined` y todos los checkboxes salen marcados. */
  fk_tperiodo_evaluacion?: number
  pk_tperiodo_evaluacion?: number
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
    id: row.fk_tperiodo_evaluacion ?? row.pk_tperiodo_evaluacion ?? 0,
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

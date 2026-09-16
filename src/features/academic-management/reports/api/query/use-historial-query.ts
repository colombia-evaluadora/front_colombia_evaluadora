import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type {
  HistorialCambio,
  HistorialDetalle,
} from "@/features/academic-management/reports/api/types"

interface HistorialDetalleRow {
  matricula: number
  estudiante: string
  documento: string | null
  promedio: number | null
  asignaturas: number | null
}

interface HistorialRow {
  pk_thistorial: number
  fk_tgrupo: number
  grupo: string
  fk_tasignatura: number | null
  asignatura: string | null
  fk_tperiodo_evaluacion: number
  periodo: string
  usuario: string | null
  fecha: string
  momento: string
  estudiantes: number | null
  detalle: HistorialDetalleRow[] | null
}

function toDetalle(row: HistorialDetalleRow): HistorialDetalle {
  return {
    matriculaId: row.matricula,
    estudiante: row.estudiante,
    documento: row.documento ?? "",
    promedio: row.promedio,
    asignaturas: row.asignaturas ?? 0,
  }
}

function toCambio(row: HistorialRow): HistorialCambio {
  return {
    id: row.pk_thistorial,
    grupoId: row.fk_tgrupo,
    grupoNombre: row.grupo,
    asignaturaId: row.fk_tasignatura,
    asignaturaNombre: row.asignatura,
    periodoId: row.fk_tperiodo_evaluacion,
    periodoNombre: row.periodo,
    usuario: row.usuario,
    fecha: row.fecha,
    momento: row.momento,
    estudiantes: row.estudiantes ?? (row.detalle?.length ?? 0),
    detalle: (row.detalle ?? []).map(toDetalle),
  }
}

export interface HistorialParams {
  grupos?: number[]
  periodos?: number[]
  anio?: number
  limite?: number
}

export const historialQueryKey = (params: HistorialParams) =>
  ["informes", "historial", params] as const

/** `POST /informes/historial`. Todos los parámetros son opcionales; sin nada
 *  devuelve el año en curso. Solo aparecen los guardados que escribieron
 *  algo, así que no hay entradas repetidas sin cambios. */
export function useHistorialQuery(params: HistorialParams, enabled = true) {
  return useQuery({
    queryKey: historialQueryKey(params),
    queryFn: async () => {
      const rows = await evalCol.postRows<HistorialRow>("/informes/historial", {
        GRUPOS: params.grupos?.length ? params.grupos : null,
        PERIODOS: params.periodos?.length ? params.periodos : null,
        ANIO: params.anio ?? null,
        LIMITE: params.limite ?? 100,
      })
      return rows.map(toCambio)
    },
    enabled,
    staleTime: 1000 * 30,
  })
}

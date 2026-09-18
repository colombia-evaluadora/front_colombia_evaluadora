import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type {
  HistorialCambio,
  HistorialDetalle,
} from "@/features/academic-management/reports/api/types"

interface HistorialDetalleRow {
  fk_tmatricula: number
  estudiante: string
  guardadas: number | null
  actualizadas: number | null
}

interface HistorialRow {
  pk_tinforme_guardado: number
  fecha: string
  momento: string
  fk_tgrupo: number
  grupo_nombre: string | null
  fk_tasignatura: number | null
  asignatura_nombre: string | null
  origen: string | null
  fk_tperiodo_evaluacion: number
  periodo_nombre: string | null
  periodo_abreviacion: string | null
  fk_tusuario: number | null
  guardado_por: string | null
  estudiantes: number | null
  detalle: HistorialDetalleRow[] | null
}

function toDetalle(row: HistorialDetalleRow): HistorialDetalle {
  return {
    matriculaId: row.fk_tmatricula,
    estudiante: row.estudiante,
    guardadas: row.guardadas ?? 0,
    actualizadas: row.actualizadas ?? 0,
  }
}

function toCambio(row: HistorialRow): HistorialCambio {
  return {
    id: row.pk_tinforme_guardado,
    grupoId: row.fk_tgrupo,
    grupoNombre: row.grupo_nombre ?? "",
    asignaturaId: row.fk_tasignatura,
    asignaturaNombre: row.asignatura_nombre,
    origen: row.origen,
    periodoId: row.fk_tperiodo_evaluacion,
    periodoNombre: row.periodo_nombre ?? "",
    periodoAbreviacion: row.periodo_abreviacion,
    usuario: row.guardado_por,
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

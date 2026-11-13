import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import { desenvolver, queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { prevencionKeys } from "@/features/gestion-estudiantil/prevencion/api/query-keys"
import type {
  AlertasEstudiante,
  Historial,
  TableroFiltros,
  TableroQueryFilters,
  TableroRow,
} from "@/features/gestion-estudiantil/prevencion/api/types"

export const BASE_PREVENCION = "/gestion-estudiantil/prevencion"

const id = (value: string) => (value ? Number(value) : null)

export function toTableroFilters(establecimiento: number, search: string, f: TableroFiltros): TableroQueryFilters {
  return {
    ESTABLECIMIENTO: establecimiento,
    PERIODO: id(f.periodo),
    SENAL: f.senal || null,
    NIVEL: f.nivel || null,
    GRUPO: id(f.grupo),
    SEDE: id(f.sede),
    JORNADA: id(f.jornada),
    SEARCH: search.trim() || null,
  }
}

export interface TableroParams {
  /** null mientras no se conoce el colegio: no se consulta. */
  filters: TableroQueryFilters | null
  pageIndex: number
  pageSize: number
}

/** `GET /tablero`: el alcance lo aplica el backend; `total_count` viene repetido en cada fila. */
export function useTableroQuery(params: TableroParams) {
  return useQuery({
    queryKey: prevencionKeys.tablero(params),
    queryFn: async () => {
      const rows = await evalCol.getRows<TableroRow>(
        `${BASE_PREVENCION}/tablero${queryString({
          ...params.filters,
          PAGEINDEX: params.pageIndex,
          PAGESIZE: params.pageSize,
        })}`,
      )
      const totalCount = Number(rows[0]?.total_count ?? 0)
      return { rows, totalCount, pageCount: toPageCount(totalCount, params.pageSize) }
    },
    enabled: params.filters != null,
    placeholderData: (prev) => prev,
  })
}

const fetchHistorial = (matricula: number | undefined) =>
  evalCol
    .getRows<Record<string, unknown>>(`${BASE_PREVENCION}/estudiantes/${matricula}/historial`)
    .then((r) => desenvolver<Historial>(r[0], "datos", "No se encontró el estudiante solicitado."))

/** Opciones de la consulta del historial, para leerlo sin montar un componente (`queryClient.fetchQuery`). */
export const historialQueryOptions = (matricula: number) => ({
  queryKey: prevencionKeys.historial(matricula),
  queryFn: () => fetchHistorial(matricula),
})

/** `GET /estudiantes/:MATRICULA/historial` → columna `datos`. */
export function useHistorialQuery(matricula: number | undefined, enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.historial(matricula ?? "none"),
    queryFn: () => fetchHistorial(matricula),
    enabled: matricula != null && enabled,
  })
}

/** `GET /estudiantes/:MATRICULA/alertas`: las señales vigentes que se consideran al valorar. */
export function useAlertasEstudianteQuery(matricula: number | undefined, enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.alertas(matricula ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<AlertasEstudiante>(`${BASE_PREVENCION}/estudiantes/${matricula}/alertas`)
        .then((r) => r[0] ?? null),
    enabled: matricula != null && enabled,
  })
}

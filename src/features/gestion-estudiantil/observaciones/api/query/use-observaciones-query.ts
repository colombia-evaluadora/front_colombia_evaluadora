import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import { desenvolver, queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { observacionesKeys } from "@/features/gestion-estudiantil/observaciones/api/query-keys"
import type {
  ObservacionDetalle,
  ObservacionRow,
  ObservacionesFiltros,
  ObservacionesQueryFilters,
  ResumenObservacion,
  ResumenObservacionInput,
} from "@/features/gestion-estudiantil/observaciones/api/types"

export const BASE_OBSERVACIONES = "/gestion-estudiantil/observaciones-sugerencias"

const id = (value: string) => (value ? Number(value) : null)

export function toObservacionesFilters(
  establecimiento: number,
  search: string,
  f: ObservacionesFiltros,
): ObservacionesQueryFilters {
  return {
    FK_TESTABLECIMIENTO: establecimiento,
    FK_TSEDE: id(f.sede),
    FK_TLV_JORNADA: id(f.jornada),
    FK_TGRUPO: id(f.grupo),
    FK_TPERIODO_EVALUACION: id(f.periodo),
    FK_TLV_DESTINATARIO: id(f.destinatario),
    SEARCH: search.trim() || null,
  }
}

export interface ObservacionesParams {
  /** null mientras no se conoce el colegio: no se consulta. */
  filters: ObservacionesQueryFilters | null
  pageIndex: number
  pageSize: number
}

/**
 * `GET /observaciones-sugerencias`: el alcance lo aplica el backend (el Responsable de grupo ve las de
 * sus grupos; Rector y Coordinador, las de su sede); las anuladas vienen marcadas. Pagina con
 * LIMITE/OFFSET y `total_count` viene repetido en cada fila.
 */
export function useObservacionesQuery(params: ObservacionesParams) {
  return useQuery({
    queryKey: observacionesKeys.lista(params),
    queryFn: async () => {
      const rows = await evalCol.getRows<ObservacionRow>(
        `${BASE_OBSERVACIONES}${queryString({
          ...params.filters,
          LIMITE: params.pageSize,
          OFFSET: params.pageIndex * params.pageSize,
        })}`,
      )
      const totalCount = Number(rows[0]?.total_count ?? 0)
      return { rows, totalCount, pageCount: toPageCount(totalCount, params.pageSize) }
    },
    enabled: params.filters != null,
    placeholderData: (prev) => prev,
  })
}

/** `GET /observaciones-sugerencias/:ID`: la fila con conteo, período y anulación, en la columna `datos`. */
export function useObservacionQuery(observacionId: number | undefined) {
  return useQuery({
    queryKey: observacionesKeys.detalle(observacionId ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<Record<string, unknown>>(`${BASE_OBSERVACIONES}/${observacionId}`)
        .then((r) => desenvolver<ObservacionDetalle>(r[0], "datos", "No se encontró la observación solicitada.")),
    enabled: observacionId != null,
  })
}

/**
 * `POST /observaciones-sugerencias/resumen`: por grupo, cuántos estudiantes la recibirán y el Período de
 * Evaluación de la fecha. Alimenta el texto bajo la Fecha (G.7.NUE.1) y el modal de confirmación
 * (G.7.ACC.1). No escribe: es una consulta.
 */
export function useResumenObservacionQuery(input: ResumenObservacionInput, enabled = true) {
  return useQuery({
    queryKey: observacionesKeys.resumen(input),
    queryFn: () => evalCol.postRows<ResumenObservacion>(`${BASE_OBSERVACIONES}/resumen`, input),
    enabled: enabled && input.FK_TGRUPOS.length > 0,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

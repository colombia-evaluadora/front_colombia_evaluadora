import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import { desenvolver } from "@/features/gestion-estudiantil/convivencia/api/query/jsonb"
import { citacionesKeys } from "@/features/gestion-estudiantil/citaciones/api/query-keys"
import type {
  CitacionDetalle,
  CitacionDocumento,
  CitacionRow,
  CitacionesFiltros,
  CitacionesQueryFilters,
} from "@/features/gestion-estudiantil/citaciones/api/types"

export const BASE_CITACIONES = "/gestion-estudiantil/citaciones"

const id = (value: string) => (value ? Number(value) : null)

export function toCitacionesFilters(search: string, f: CitacionesFiltros): CitacionesQueryFilters {
  return {
    SEARCH: search.trim() || null,
    ESTADO: f.estado || null,
    FK_TLV_MOTIVO: id(f.motivo),
    FK_TFUNCIONARIO_ATIENDE: id(f.atiende),
    DESDE: f.desde || null,
    HASTA: f.hasta || null,
    FK_TSEDE: id(f.sede),
    FK_TLV_JORNADA: id(f.jornada),
  }
}

export interface CitacionesParams {
  filters: CitacionesQueryFilters
  pageIndex: number
  pageSize: number
}

/** `POST /citaciones/query`: el alcance lo aplica el backend; `total_count` viene repetido en cada fila. */
export function useCitacionesQuery(params: CitacionesParams) {
  return useQuery({
    queryKey: citacionesKeys.citaciones.lista(params),
    queryFn: async () => {
      const rows = await evalCol.postRows<CitacionRow>(`${BASE_CITACIONES}/query`, {
        FILTERS: params.filters,
        PAGEINDEX: params.pageIndex,
        PAGESIZE: params.pageSize,
      })
      const totalCount = Number(rows[0]?.total_count ?? 0)
      return { rows, totalCount, pageCount: toPageCount(totalCount, params.pageSize) }
    },
    placeholderData: (prev) => prev,
  })
}

/** `GET /citaciones/:ID`: la fila con su historial, en la columna `datos`. */
export function useCitacionQuery(citacionId: number | undefined) {
  return useQuery({
    queryKey: citacionesKeys.citaciones.detalle(citacionId ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<Record<string, unknown>>(`${BASE_CITACIONES}/${citacionId}`)
        .then((r) => desenvolver<CitacionDetalle>(r[0], "datos", "No se encontró la citación solicitada.")),
    enabled: citacionId != null,
  })
}

/** `GET /citaciones/:ID/documento`: los datos de la citación impresa (sin origen, historial ni estado). */
export function useCitacionDocumentoQuery(citacionId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: citacionesKeys.citaciones.documento(citacionId ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<Record<string, unknown>>(`${BASE_CITACIONES}/${citacionId}/documento`)
        .then((r) => desenvolver<CitacionDocumento>(r[0], "datos", "No se encontró la citación solicitada.")),
    enabled: citacionId != null && enabled,
  })
}

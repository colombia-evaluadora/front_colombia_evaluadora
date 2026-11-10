import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import { desenvolver } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { citacionesKeys } from "@/features/gestion-estudiantil/citaciones/api/query-keys"
import type {
  CompromisoDetalle,
  CompromisoDocumento,
  CompromisoRow,
  CompromisosFiltros,
  CompromisosQueryFilters,
} from "@/features/gestion-estudiantil/citaciones/api/types"

export const BASE_COMPROMISOS = "/gestion-estudiantil/compromisos"

const id = (value: string) => (value ? Number(value) : null)

export function toCompromisosFilters(search: string, f: CompromisosFiltros): CompromisosQueryFilters {
  return {
    SEARCH: search.trim() || null,
    FK_TLV_TIPO: id(f.tipo),
    ESTADO: f.estado || null,
    FK_TSEDE: id(f.sede),
    FK_TLV_JORNADA: id(f.jornada),
  }
}

export interface CompromisosParams {
  filters: CompromisosQueryFilters
  pageIndex: number
  pageSize: number
}

/** `POST /compromisos/query`: el alcance lo aplica el backend; `total_count` viene repetido en cada fila. */
export function useCompromisosQuery(params: CompromisosParams) {
  return useQuery({
    queryKey: citacionesKeys.compromisos.lista(params),
    queryFn: async () => {
      const rows = await evalCol.postRows<CompromisoRow>(`${BASE_COMPROMISOS}/query`, {
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

/** `GET /compromisos/:ID`: la fila con sus ítems, en la columna `datos`. */
export function useCompromisoQuery(compromisoId: number | undefined) {
  return useQuery({
    queryKey: citacionesKeys.compromisos.detalle(compromisoId ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<Record<string, unknown>>(`${BASE_COMPROMISOS}/${compromisoId}`)
        .then((r) => desenvolver<CompromisoDetalle>(r[0], "datos", "No se encontró el compromiso solicitado.")),
    enabled: compromisoId != null,
  })
}

/** `GET /compromisos/:ID/documento`: los datos del acta de compromiso. */
export function useCompromisoDocumentoQuery(compromisoId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: citacionesKeys.compromisos.documento(compromisoId ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<Record<string, unknown>>(`${BASE_COMPROMISOS}/${compromisoId}/documento`)
        .then((r) => desenvolver<CompromisoDocumento>(r[0], "datos", "No se encontró el compromiso solicitado.")),
    enabled: compromisoId != null && enabled,
  })
}

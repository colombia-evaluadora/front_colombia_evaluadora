import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import type { OrdenServidor } from "@/features/gestion-estudiantil/commons/utils/orden-servidor"
import { desenvolver } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { citacionesKeys } from "@/features/gestion-estudiantil/citaciones/api/query-keys"
import type {
  CompromisoDetalle,
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
  orden?: OrdenServidor
}

export const fetchCompromisos = async (params: CompromisosParams) => {
  const rows = await evalCol.postRows<CompromisoRow>(`${BASE_COMPROMISOS}/query`, {
    FILTERS: params.filters,
    ...params.orden,
    PAGEINDEX: params.pageIndex,
    PAGESIZE: params.pageSize,
  })
  const totalCount = Number(rows[0]?.total_count ?? 0)
  return { rows, totalCount, pageCount: toPageCount(totalCount, params.pageSize) }
}

/** `POST /compromisos/query`: el alcance lo aplica el backend; `total_count` viene repetido en cada fila. */
export function useCompromisosQuery(params: CompromisosParams) {
  return useQuery({
    queryKey: citacionesKeys.compromisos.lista(params),
    queryFn: () => fetchCompromisos(params),
    placeholderData: (prev) => prev,
  })
}

export const fetchCompromiso = (compromisoId: number | undefined) =>
  evalCol
    .getRows<Record<string, unknown>>(`${BASE_COMPROMISOS}/${compromisoId}`)
    .then((r) => desenvolver<CompromisoDetalle>(r[0], "datos", "No se encontró el compromiso solicitado."))

/** `GET /compromisos/:ID`: la fila con sus ítems, en la columna `datos`. */
export function useCompromisoQuery(compromisoId: number | undefined) {
  return useQuery({
    queryKey: citacionesKeys.compromisos.detalle(compromisoId ?? "none"),
    queryFn: () => fetchCompromiso(compromisoId),
    enabled: compromisoId != null,
  })
}


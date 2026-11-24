import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import { desenvolver, queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { reconocimientosKeys } from "@/features/gestion-estudiantil/reconocimientos/api/query-keys"
import type {
  ReconocimientoDetalle,
  ReconocimientoRow,
  ReconocimientosFiltros,
  ReconocimientosQueryFilters,
} from "@/features/gestion-estudiantil/reconocimientos/api/types"

export const BASE_RECONOCIMIENTOS = "/gestion-estudiantil/reconocimientos"

const id = (value: string) => (value ? Number(value) : null)

export function toReconocimientosFilters(
  establecimiento: number,
  search: string,
  f: ReconocimientosFiltros,
): ReconocimientosQueryFilters {
  return {
    ESTABLECIMIENTO: establecimiento,
    SEDE: id(f.sede),
    JORNADA: id(f.jornada),
    TIPO: id(f.tipo),
    PERIODO: id(f.periodo),
    SEARCH: search.trim() || null,
    ANULADOS: f.anulados === "true",
  }
}

export interface ReconocimientosParams {
  /** null mientras no se conoce el colegio: no se consulta. */
  filters: ReconocimientosQueryFilters | null
  pageIndex: number
  pageSize: number
}

export const fetchReconocimientos = async (params: ReconocimientosParams) => {
  const rows = await evalCol.getRows<ReconocimientoRow>(
    `${BASE_RECONOCIMIENTOS}${queryString({
      ...params.filters,
      PAGEINDEX: params.pageIndex,
      PAGESIZE: params.pageSize,
    })}`,
  )
  const totalCount = Number(rows[0]?.total_count ?? 0)
  return { rows, totalCount, pageCount: toPageCount(totalCount, params.pageSize) }
}

/** `GET /reconocimientos`: el alcance lo aplica el backend; `total_count` viene repetido en cada fila. */
export function useReconocimientosQuery(params: ReconocimientosParams) {
  return useQuery({
    queryKey: reconocimientosKeys.lista(params),
    queryFn: () => fetchReconocimientos(params),
    enabled: params.filters != null,
    placeholderData: (prev) => prev,
  })
}

export const fetchReconocimiento = (reconocimientoId: number | undefined) =>
  evalCol
    .getRows<Record<string, unknown>>(`${BASE_RECONOCIMIENTOS}/${reconocimientoId}`)
    .then((r) => desenvolver<ReconocimientoDetalle>(r[0], "datos", "No se encontró el reconocimiento solicitado."))

/** `GET /reconocimientos/:ID`: la fila con actividad, soporte y anulación, en la columna `datos`. */
export function useReconocimientoQuery(reconocimientoId: number | undefined) {
  return useQuery({
    queryKey: reconocimientosKeys.detalle(reconocimientoId ?? "none"),
    queryFn: () => fetchReconocimiento(reconocimientoId),
    enabled: reconocimientoId != null,
  })
}


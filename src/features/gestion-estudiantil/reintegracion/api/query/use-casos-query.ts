import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import { desenvolver, queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { reintegracionKeys } from "@/features/gestion-estudiantil/reintegracion/api/query-keys"
import {
  PROFESIONAL_SIN_ASIGNAR,
  type CasoDetalle,
  type CasoRow,
  type CasosFiltros,
  type CasosQueryFilters,
} from "@/features/gestion-estudiantil/reintegracion/api/types"

export const BASE_REINTEGRACION = "/gestion-estudiantil/reintegracion"

const id = (value: string) => (value && value !== PROFESIONAL_SIN_ASIGNAR ? Number(value) : null)

export function toCasosFilters(establecimiento: number, search: string, f: CasosFiltros): CasosQueryFilters {
  return {
    ESTABLECIMIENTO: establecimiento,
    SEARCH: search.trim() || null,
    SEDE: id(f.sede),
    JORNADA: id(f.jornada),
    ESTADO: f.estado || null,
    PROFESIONAL: id(f.profesional),
    SIN_ASIGNAR: f.profesional === PROFESIONAL_SIN_ASIGNAR,
    ORIGEN: f.origen || null,
  }
}

export interface CasosParams {
  filters: CasosQueryFilters | null
  pageIndex: number
  pageSize: number
}

/** `GET /casos`: bandeja paginada en el servidor; `total_count` viene repetido en cada fila. */
export function useCasosQuery(params: CasosParams) {
  return useQuery({
    queryKey: reintegracionKeys.casos(params),
    queryFn: async () => {
      const rows = await evalCol.getRows<CasoRow>(
        `${BASE_REINTEGRACION}/casos${queryString({
          ...params.filters,
          PAGEINDEX: params.pageIndex,
          PAGESIZE: params.pageSize,
        })}`,
      )
      const totalCount = Number(rows[0]?.total_count ?? 0)
      return { rows, totalCount, pageCount: toPageCount(totalCount, params.pageSize) }
    },
    enabled: params.filters != null,
    retry: false,
    placeholderData: (prev) => prev,
  })
}

/** `GET /casos/:ID` → columna `datos`. Abrir el caso deja traza de consulta: no se cachea. */
export function useCasoQuery(casoId: number | undefined) {
  return useQuery({
    queryKey: reintegracionKeys.caso(casoId ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<Record<string, unknown>>(`${BASE_REINTEGRACION}/casos/${casoId}`)
        .then((r) => desenvolver<CasoDetalle>(r[0], "datos", "No se encontró el caso de reintegración.")),
    enabled: casoId != null,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  })
}

/**
 * El mismo detalle para los diálogos de acción: comparte la caché de la página y no vuelve a pedirlo mientras
 * esté fresco (cada petición deja traza de consulta).
 */
export function useCasoDialogoQuery(casoId: number) {
  return useQuery({
    queryKey: reintegracionKeys.caso(casoId),
    queryFn: () =>
      evalCol
        .getRows<Record<string, unknown>>(`${BASE_REINTEGRACION}/casos/${casoId}`)
        .then((r) => desenvolver<CasoDetalle>(r[0], "datos", "No se encontró el caso de reintegración.")),
    retry: false,
    staleTime: 30_000,
  })
}

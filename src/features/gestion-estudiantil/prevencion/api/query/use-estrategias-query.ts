import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import { desenvolver, queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { prevencionKeys } from "@/features/gestion-estudiantil/prevencion/api/query-keys"
import { BASE_PREVENCION } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import type {
  EstrategiaDetalle,
  EstrategiaRow,
  EstrategiasFiltros,
  EstrategiasQueryFilters,
  GradoEstrategia,
  MatriculadoEstrategia,
} from "@/features/gestion-estudiantil/prevencion/api/types"

const id = (value: string) => (value ? Number(value) : null)

/** `tipoCodigo` es el VALOR de la lista (el backend filtra por código, no por pk). */
export function toEstrategiasFilters(
  establecimiento: number,
  search: string,
  f: EstrategiasFiltros,
  tipoCodigo: string | undefined,
): EstrategiasQueryFilters {
  return {
    ESTABLECIMIENTO: establecimiento,
    SEDE: id(f.sede),
    JORNADA: id(f.jornada),
    TIPO: tipoCodigo ?? null,
    ESTADO: f.estado || null,
    SEARCH: search.trim() || null,
  }
}

export interface EstrategiasParams {
  filters: EstrategiasQueryFilters | null
  pageIndex: number
  pageSize: number
}

/** `GET /estrategias`: las que la persona ve, más recientes primero; `total_count` viene en cada fila. */
export function useEstrategiasQuery(params: EstrategiasParams) {
  return useQuery({
    queryKey: prevencionKeys.estrategias(params),
    queryFn: async () => {
      const rows = await evalCol.getRows<EstrategiaRow>(
        `${BASE_PREVENCION}/estrategias${queryString({
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

export interface EstrategiaPagina {
  pageIndex: number
  pageSize: number
}

/** `GET /estrategias/:ID` → columna `datos`; los beneficiarios vienen paginados. */
export function useEstrategiaQuery(estrategiaId: number | undefined, pagina: EstrategiaPagina, enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.estrategia(estrategiaId ?? "none", pagina),
    queryFn: () =>
      evalCol
        .getRows<Record<string, unknown>>(
          `${BASE_PREVENCION}/estrategias/${estrategiaId}${queryString({
            PAGEINDEX: pagina.pageIndex,
            PAGESIZE: pagina.pageSize,
          })}`,
        )
        .then((r) => desenvolver<EstrategiaDetalle>(r[0], "datos", "No se encontró la estrategia.")),
    enabled: enabled && estrategiaId != null,
    retry: false,
    placeholderData: (prev) => prev,
  })
}

export interface MatriculadosParams {
  grado: string
  search: string
  pageIndex: number
  pageSize: number
}

const rutaMatriculados = (estrategiaId: number, p: MatriculadosParams) =>
  `${BASE_PREVENCION}/estrategias/${estrategiaId}/matriculados${queryString({
    GRADO: id(p.grado),
    SEARCH: p.search.trim() || null,
    PAGEINDEX: p.pageIndex,
    PAGESIZE: p.pageSize,
  })}`

/** Una página de `GET /estrategias/:ID/matriculados` (también la usa «Seleccionar todos» para recorrer el resto). */
export const pedirMatriculados = (estrategiaId: number, p: MatriculadosParams) =>
  evalCol.getRows<MatriculadoEstrategia>(rutaMatriculados(estrategiaId, p))

/** Matriculados Cursando del Período Académico de la estrategia, con `total_count` del conjunto filtrado. */
export function useMatriculadosEstrategiaQuery(estrategiaId: number | undefined, p: MatriculadosParams) {
  return useQuery({
    queryKey: prevencionKeys.estrategiaMatriculados(estrategiaId ?? "none", p),
    queryFn: async () => {
      const rows = await pedirMatriculados(estrategiaId as number, p)
      return { rows, totalCount: Number(rows[0]?.total_count ?? 0) }
    },
    enabled: estrategiaId != null,
    retry: false,
    placeholderData: (prev) => prev,
  })
}

/** `GET /estrategias/:ID/grados`: opciones del filtro Grado al agregar beneficiarios. */
export function useGradosEstrategiaQuery(estrategiaId: number | undefined) {
  return useQuery({
    queryKey: prevencionKeys.estrategiaGrados(estrategiaId ?? "none"),
    queryFn: () => evalCol.getRows<GradoEstrategia>(`${BASE_PREVENCION}/estrategias/${estrategiaId}/grados`),
    enabled: estrategiaId != null,
    staleTime: 60_000,
  })
}

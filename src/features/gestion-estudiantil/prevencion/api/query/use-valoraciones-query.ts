import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import { desenvolver, queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { prevencionKeys } from "@/features/gestion-estudiantil/prevencion/api/query-keys"
import { BASE_PREVENCION } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import type {
  PlanDetalle,
  PlanSoporte,
  ValoracionDetalle,
  ValoracionRow,
  ValoracionesFiltros,
  ValoracionesQueryFilters,
} from "@/features/gestion-estudiantil/prevencion/api/types"

const id = (value: string) => (value ? Number(value) : null)

export function toValoracionesFilters(
  establecimiento: number,
  search: string,
  f: ValoracionesFiltros,
): ValoracionesQueryFilters {
  return {
    ESTABLECIMIENTO: establecimiento,
    NIVEL: f.nivel || null,
    ESTADO: f.estado || null,
    SEARCH: search.trim() || null,
    SEDE: id(f.sede),
    JORNADA: id(f.jornada),
    ANULADAS: f.anuladas === "true",
  }
}

export interface ValoracionesParams {
  filters: ValoracionesQueryFilters | null
  pageIndex: number
  pageSize: number
}

export const fetchValoraciones = async (params: ValoracionesParams) => {
  const rows = await evalCol.getRows<ValoracionRow>(
    `${BASE_PREVENCION}/valoraciones${queryString({
      ...params.filters,
      PAGEINDEX: params.pageIndex,
      PAGESIZE: params.pageSize,
    })}`,
  )
  const totalCount = Number(rows[0]?.total_count ?? 0)
  return { rows, totalCount, pageCount: toPageCount(totalCount, params.pageSize) }
}

/** `GET /valoraciones`: valoraciones y planes dentro del alcance, más recientes primero. */
export function useValoracionesQuery(params: ValoracionesParams) {
  return useQuery({
    queryKey: prevencionKeys.valoraciones(params),
    queryFn: () => fetchValoraciones(params),
    enabled: params.filters != null,
    placeholderData: (prev) => prev,
  })
}

export const fetchValoracion = (valoracionId: number | undefined) =>
  evalCol
    .getRows<Record<string, unknown>>(`${BASE_PREVENCION}/valoraciones/${valoracionId}`)
    .then((r) => desenvolver<ValoracionDetalle>(r[0], "datos", "No se encontró la valoración solicitada."))

/** `GET /valoraciones/:ID` → columna `datos`. */
export function useValoracionQuery(valoracionId: number | undefined) {
  return useQuery({
    queryKey: prevencionKeys.valoracion(valoracionId ?? "none"),
    queryFn: () => fetchValoracion(valoracionId),
    enabled: valoracionId != null,
  })
}

export const fetchPlan = (planId: number | undefined) =>
  evalCol
    .getRows<Record<string, unknown>>(`${BASE_PREVENCION}/planes/${planId}`)
    .then((r) => desenvolver<PlanDetalle>(r[0], "datos", "No se encontró el plan solicitado."))

/** `GET /planes/:ID` → columna `datos`. */
export function usePlanQuery(planId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.plan(planId ?? "none"),
    queryFn: () => fetchPlan(planId),
    enabled: planId != null && enabled,
  })
}

/** `GET /planes/:ID/soporte`: sin fila si el plan no tiene soporte de aceptación presencial. */
export function usePlanSoporteQuery(planId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.planSoporte(planId ?? "none"),
    queryFn: () =>
      evalCol.getRows<PlanSoporte>(`${BASE_PREVENCION}/planes/${planId}/soporte`).then((r) => r[0] ?? null),
    enabled: planId != null && enabled,
  })
}

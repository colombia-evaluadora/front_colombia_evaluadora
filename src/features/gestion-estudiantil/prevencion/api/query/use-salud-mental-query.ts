import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import { desenvolver, queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { prevencionKeys } from "@/features/gestion-estudiantil/prevencion/api/query-keys"
import { BASE_PREVENCION } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import type {
  SaludMentalFiltros,
  SaludMentalQueryFilters,
  SenalSMDetalle,
  SenalSMRow,
} from "@/features/gestion-estudiantil/prevencion/api/types"

const id = (value: string) => (value ? Number(value) : null)

export function toSaludMentalFilters(
  establecimiento: number,
  search: string,
  f: SaludMentalFiltros,
): SaludMentalQueryFilters {
  return {
    ESTABLECIMIENTO: establecimiento,
    SEVERIDAD: f.severidad || null,
    ESTADO: f.estado || null,
    SEDE: id(f.sede),
    JORNADA: id(f.jornada),
    SEARCH: search.trim() || null,
  }
}

export interface SaludMentalParams {
  filters: SaludMentalQueryFilters | null
  pageIndex: number
  pageSize: number
}

/** `GET /salud-mental`: señales que la persona ve, más recientes primero; `total_count` viene en cada fila. */
export function useSaludMentalQuery(params: SaludMentalParams) {
  return useQuery({
    queryKey: prevencionKeys.saludMental(params),
    queryFn: async () => {
      const rows = await evalCol.getRows<SenalSMRow>(
        `${BASE_PREVENCION}/salud-mental${queryString({
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

/**
 * Sondeo de acceso a la pestaña «Salud mental»: la lista con una fila. A quien el backend no deja leer
 * le responde 403 y la pestaña no se muestra (información sensible, Regla 1).
 */
export function useSaludMentalAccesoQuery(establecimiento: number | null) {
  return useQuery({
    queryKey: prevencionKeys.saludMentalAcceso(establecimiento ?? "none"),
    queryFn: () =>
      evalCol.getRows<SenalSMRow>(
        `${BASE_PREVENCION}/salud-mental${queryString({ ESTABLECIMIENTO: establecimiento, PAGEINDEX: 0, PAGESIZE: 1 })}`,
      ),
    enabled: establecimiento != null,
    retry: false,
    staleTime: 60_000,
  })
}

/** `GET /salud-mental/:ID` → columna `datos`. Cada apertura deja traza de consulta (Regla 21): no se cachea. */
export function useSenalSMQuery(senalId: number | undefined) {
  return useQuery({
    queryKey: prevencionKeys.senalSM(senalId ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<Record<string, unknown>>(`${BASE_PREVENCION}/salud-mental/${senalId}`)
        .then((r) => desenvolver<SenalSMDetalle>(r[0], "datos", "No se encontró la señal de salud mental.")),
    enabled: senalId != null,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  })
}

import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import { desenvolver, queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { prevencionKeys } from "@/features/gestion-estudiantil/prevencion/api/query-keys"
import { BASE_PREVENCION } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import type {
  CaracterizacionDetalle,
  CaracterizacionesFiltros,
  CaracterizacionesQueryFilters,
  CaracterizacionRow,
  OpcionCaracterizacionFiltro,
  OpcionListaCaracterizacion,
} from "@/features/gestion-estudiantil/prevencion/api/types"

const id = (value: string) => (value ? Number(value) : null)

/** Estado del filtro (varios) → CSV de códigos que espera el backend. */
export function toCaracterizacionesFilters(
  establecimiento: number,
  search: string,
  f: CaracterizacionesFiltros,
): CaracterizacionesQueryFilters {
  return {
    ESTABLECIMIENTO: establecimiento,
    SEDE: id(f.sede),
    JORNADA: id(f.jornada),
    GRUPO: id(f.grupo),
    ESTADO: f.estado.length > 0 ? f.estado.join(",") : null,
    SEARCH: search.trim() || null,
  }
}

export interface CaracterizacionesParams {
  filters: CaracterizacionesQueryFilters | null
  pageIndex: number
  pageSize: number
}

/** `GET /caracterizaciones`: estudiantes Cursando con su estado; `total_count` y `sin_confirmar` vienen en cada fila. */
export function useCaracterizacionesQuery(params: CaracterizacionesParams) {
  return useQuery({
    queryKey: prevencionKeys.caracterizaciones(params),
    queryFn: async () => {
      const rows = await evalCol.getRows<CaracterizacionRow>(
        `${BASE_PREVENCION}/caracterizaciones${queryString({
          ...params.filters,
          PAGEINDEX: params.pageIndex,
          PAGESIZE: params.pageSize,
        })}`,
      )
      const totalCount = Number(rows[0]?.total_count ?? 0)
      return {
        rows,
        totalCount,
        sinConfirmar: Number(rows[0]?.sin_confirmar ?? 0),
        pageCount: toPageCount(totalCount, params.pageSize),
      }
    },
    enabled: params.filters != null,
    retry: false,
    placeholderData: (prev) => prev,
  })
}

/** `GET /opciones/caracterizacion-filtros`: grupos con estudiantes Cursando en el ámbito sensible de quien consulta. */
export function useCaracterizacionFiltrosQuery(establecimiento: number | null) {
  return useQuery({
    queryKey: prevencionKeys.opciones.caracterizacionFiltros(establecimiento ?? "none"),
    queryFn: () =>
      evalCol.getRows<OpcionCaracterizacionFiltro>(
        `${BASE_PREVENCION}/opciones/caracterizacion-filtros${queryString({ ESTABLECIMIENTO: establecimiento })}`,
      ),
    enabled: establecimiento != null,
    staleTime: 60_000,
  })
}

/** `GET /opciones/caracterizacion`: todas las listas del formulario, con id y código estable. */
export function useOpcionesCaracterizacionQuery() {
  return useQuery({
    queryKey: prevencionKeys.opciones.caracterizacion,
    queryFn: () => evalCol.getRows<OpcionListaCaracterizacion>(`${BASE_PREVENCION}/opciones/caracterizacion`),
    staleTime: 5 * 60_000,
  })
}

/**
 * `GET /caracterizaciones/:MATRICULA` → columna `datos`. No crea la fila (sin ella devuelve la copia del año
 * anterior como Por confirmar, o Sin diligenciar) y deja la traza de consulta: no se reconsulta al enfocar.
 */
export function useCaracterizacionQuery(matricula: number | undefined) {
  return useQuery({
    queryKey: prevencionKeys.caracterizacion(matricula ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<Record<string, unknown>>(`${BASE_PREVENCION}/caracterizaciones/${matricula}`)
        .then((r) => desenvolver<CaracterizacionDetalle>(r[0], "datos", "No se encontró la caracterización.")),
    enabled: matricula != null,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 0,
    gcTime: 0,
  })
}

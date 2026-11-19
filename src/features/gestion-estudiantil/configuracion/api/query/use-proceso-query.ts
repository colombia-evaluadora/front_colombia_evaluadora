import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import { queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { configuracionKeys } from "@/features/gestion-estudiantil/configuracion/api/query-keys"
import type {
  ClasificacionRow,
  EfectoSancion,
  PlazosDisciplinario,
  SancionFiltros,
  SancionRow,
} from "@/features/gestion-estudiantil/configuracion/api/types"

export const BASE_PROCESO = "/gestion-estudiantil/proceso-disciplinario"

/** La clasificación de faltas es corta (unas pocas por establecimiento) y el prototipo no la pagina: va en una página. */
const PAGINA_UNICA = 200

/** `GET /proceso-disciplinario/plazos`. */
export function usePlazosDisciplinarioQuery(establecimiento: number | null) {
  return useQuery({
    queryKey: configuracionKeys.plazos(establecimiento ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<PlazosDisciplinario>(`${BASE_PROCESO}/plazos${queryString({ ESTABLECIMIENTO: establecimiento })}`)
        .then((r) => r[0] ?? null),
    enabled: establecimiento != null,
    retry: false,
  })
}

/** `POST /proceso-disciplinario/clasificaciones/query`: el listado del prototipo no tiene búsqueda ni filtros. */
export function useClasificacionesQuery(establecimiento: number | null) {
  return useQuery({
    queryKey: configuracionKeys.clasificaciones(establecimiento ?? "none"),
    queryFn: () =>
      evalCol.postRows<ClasificacionRow>(`${BASE_PROCESO}/clasificaciones/query`, {
        FK_ESTABLECIMIENTO: establecimiento,
        FILTERS: { SEARCH: null, HABILITADO: null },
        PAGEINDEX: 0,
        PAGESIZE: PAGINA_UNICA,
      }),
    enabled: establecimiento != null,
  })
}

/** `POST /proceso-disciplinario/sanciones/query`: Contiene las palabras, Instancia y Estado, paginado en el servidor. */
export function useSancionesQuery(
  establecimiento: number | null,
  search: string,
  filtros: SancionFiltros,
  pageIndex: number,
  pageSize: number,
) {
  const FILTERS = {
    SEARCH: search.trim() || null,
    FK_INSTANCIA: filtros.instancia ? Number(filtros.instancia) : null,
    HABILITADO: filtros.estado ? filtros.estado === "activo" : null,
  }
  return useQuery({
    queryKey: configuracionKeys.sanciones({ establecimiento, FILTERS, pageIndex, pageSize }),
    queryFn: async () => {
      const rows = await evalCol.postRows<SancionRow>(`${BASE_PROCESO}/sanciones/query`, {
        FK_ESTABLECIMIENTO: establecimiento,
        FILTERS,
        PAGEINDEX: pageIndex,
        PAGESIZE: pageSize,
      })
      const totalCount = rows[0]?.total_count ?? 0
      return { rows, totalCount, pageCount: toPageCount(totalCount, pageSize) }
    },
    enabled: establecimiento != null,
    placeholderData: keepPreviousData,
  })
}

/** `GET /proceso-disciplinario/sanciones/efectos`: en un establecimiento Oficial no llegan No renovación ni Cancelación. */
export function useEfectosSancionQuery(establecimiento: number | null) {
  return useQuery({
    queryKey: configuracionKeys.efectos(establecimiento ?? "none"),
    queryFn: () =>
      evalCol.getRows<EfectoSancion>(`${BASE_PROCESO}/sanciones/efectos${queryString({ ESTABLECIMIENTO: establecimiento })}`),
    enabled: establecimiento != null,
    staleTime: 5 * 60_000,
  })
}

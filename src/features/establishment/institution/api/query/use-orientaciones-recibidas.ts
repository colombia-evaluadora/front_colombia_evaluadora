import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPageCount } from "@/lib/pagination"

import { establishmentKeys } from "@/features/establishment/institution/api/query-keys"
import type {
  OrientacionRecibida,
  OrientacionRecibidaDetalle,
  OrientacionesRecibidas,
  OrientacionesRecibidasParams,
} from "@/features/establishment/institution/api/types/orientacion"

/** sso V433: la pestaña Orientaciones de la vista Establecimientos (informe, 2.3). Solo backend real. */
export const ORIENTACIONES_RECIBIDAS_BASE = "/cobertura-academica/orientaciones-recibidas"

interface ListaDatos {
  total: number
  pendientes: number
  filas: OrientacionRecibida[]
}

async function fetchOrientacionesRecibidas(
  params: OrientacionesRecibidasParams,
): Promise<OrientacionesRecibidas> {
  const [row] = await evalCol.postRows<{ datos: ListaDatos }>(
    `${ORIENTACIONES_RECIBIDAS_BASE}/consulta`,
    {
      FILTERS: {
        FK_ESTABLECIMIENTO: params.establecimientoId ?? null,
        SEARCH: params.search || null,
        ESTADO: params.estado ?? null,
        TEMA: params.tema || null,
      },
      SORTING: { ID: params.sortBy ?? null, DESC: params.sortDesc ?? false },
      PAGEINDEX: params.pageIndex,
      PAGESIZE: params.pageSize,
    },
  )
  const datos = row?.datos
  const totalCount = datos?.total ?? 0
  return {
    rows: datos?.filas ?? [],
    totalCount,
    pageCount: toPageCount(totalCount, params.pageSize),
    pendientes: datos?.pendientes ?? 0,
  }
}

/**
 * Lista de orientaciones recibidas. `enabled` en false mientras el Superadministrador no elige
 * establecimiento (el backend lo exige) o si el usuario no tiene la pestaña.
 */
export function useOrientacionesRecibidasQuery(
  params: OrientacionesRecibidasParams,
  enabled = true,
) {
  return useQuery({
    queryKey: establishmentKeys.orientaciones.lista(params),
    queryFn: () => fetchOrientacionesRecibidas(params),
    placeholderData: (prev) => prev,
    enabled,
  })
}

/** Enviadas sin responder, para el nombre de la pestaña aunque esté en Establecimientos. */
export function useOrientacionesPendientesQuery(
  establecimientoId: number | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: establishmentKeys.orientaciones.lista({ establecimientoId, contador: true }),
    queryFn: () => fetchOrientacionesRecibidas({ establecimientoId, pageIndex: 0, pageSize: 1 }),
    select: (data) => data.pendientes,
    enabled,
  })
}

async function fetchOrientacionRecibida(id: number) {
  const row = await evalCol.getRow<{ datos: OrientacionRecibidaDetalle | null }>(
    `${ORIENTACIONES_RECIBIDAS_BASE}/${id}`,
  )
  return row.datos
}

export function useOrientacionRecibidaQuery(id: number | undefined) {
  return useQuery({
    queryKey: establishmentKeys.orientaciones.detalle(id ?? "none"),
    queryFn: () => fetchOrientacionRecibida(id as number),
    enabled: Boolean(id),
  })
}

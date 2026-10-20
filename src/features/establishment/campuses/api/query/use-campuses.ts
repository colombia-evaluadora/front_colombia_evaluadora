import { proveedorMeta } from "@/lib/offline/query-meta"
import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { toSingleSort } from "@/lib/query-request-mapping"
import { unwrapPaginated } from "@/lib/response-envelope"
import { campusKeys } from "@/features/establishment/campuses/api/query-keys"

import type {
  Campus,
  CampusesQueryRequest,
  CampusesQueryResponse,
} from "@/features/establishment/campuses/api/types/campus"

// Exportado: la exportación debe normalizar los filtros igual que el listado.
export function toCampusesQueryFilters(filters: CampusesQueryRequest["filters"]) {
  // `zones` viaja como código (bind VARCHAR[]), no como id.
  return { ...filters, zones: filters.zones ?? [] }
}

interface UseCampusesQueryParams {
  filters: CampusesQueryRequest["filters"]
  sorting: CampusesQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

/** Fila de `fn_sed_listar_paginado`: no trae `barrio`/`comuna`. */
interface RealCampusRow {
  pk_sede: number
  codigo: string
  nombre: string
  consecutivo: string
  fk_zona: number | null
  zona_nombre: string | null
  direccion: string | null
  telefono: string | null
}

function toCampus(row: RealCampusRow): Campus {
  return {
    id: row.pk_sede,
    name: row.nombre,
    dane: row.codigo ?? "",
    zone: row.fk_zona === null ? null : { id: row.fk_zona, code: "", name: row.zona_nombre ?? "" },
    // Solo vienen en el detalle.
    neighborhood: "",
    commune: "",
    address: row.direccion ?? "",
    phone: row.telefono ?? "",
  }
}

export async function fetchCampuses(params: CampusesQueryRequest): Promise<CampusesQueryResponse> {
  if (env.ENABLE_API_MOCKING) {
    const response = await api.query(
      apiPath("/establishments/campuses/query", "/establecimientos/sedes/query"),
      params,
    )
    return unwrapPaginated(response)
  }

  // El mock espera `sorting` como array; el backend, un único objeto.
  const body = {
    ...params,
    filters: toCampusesQueryFilters(params.filters),
    sorting: toSingleSort(params.sorting),
  }
  const response = await api.query(
    apiPath("/establishments/campuses/query", "/establecimientos/sedes/query"),
    body,
  )
  const result = unwrapPaginated<RealCampusRow>(response)
  return { ...result, rows: result.rows.map(toCampus) }
}

export const campusesQueryKey = (params: UseCampusesQueryParams) => campusKeys.lista(params)

export function useCampusesQuery(params: UseCampusesQueryParams) {
  return useQuery({
    queryKey: campusesQueryKey(params),
    meta: proveedorMeta(),
    queryFn: () => fetchCampuses(params),
    placeholderData: (previous) => previous,
  })
}

import { proveedorMeta } from "@/lib/offline/query-meta"
import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toSingleSort } from "@/lib/query-request-mapping"
import { toPageCount } from "@/lib/pagination"
import { campusKeys } from "@/features/establishment/campuses/api/query-keys"

import type {
  CampusRow,
  CampusStatus,
  CampusesQueryRequest,
  CampusesQueryResponse,
} from "@/features/establishment/campuses/api/types/campus"

// Los binds son arreglos (BIGINT[] / TEXT[]): vacíos, como lista vacía.
// Exportado: la exportación debe normalizar los filtros igual que el listado.
export function toCampusesQueryFilters(filters: CampusesQueryRequest["filters"]) {
  return {
    search: filters.search,
    establishments: filters.establishments ?? [],
    zones: filters.zones ?? [],
    workSchedules: filters.workSchedules ?? [],
    statuses: filters.statuses ?? [],
  }
}

interface UseCampusesQueryParams {
  filters: CampusesQueryRequest["filters"]
  sorting: CampusesQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

/** Fila de `fn_sed_listar` (sso V448), dentro de `rows` de `fn_sed_listar_paginado`. */
export interface RealCampusRow {
  pk_sede: number
  codigo: string
  nombre: string
  consecutivo: string
  es_principal: boolean
  fk_establecimiento: number
  establecimiento_nombre: string
  fk_zona: number | null
  zona_nombre: string | null
  jornadas: string | null
  estado: CampusStatus
}

interface RealCampusesPage {
  rows: RealCampusRow[]
  total_count: number
  page_count: number
}

export function toCampusRow(row: RealCampusRow): CampusRow {
  return {
    id: row.pk_sede,
    consecutive: row.consecutivo ?? "",
    isPrincipal: row.es_principal === true,
    name: row.nombre,
    dane: row.codigo ?? "",
    establishmentId: row.fk_establecimiento,
    establishmentName: row.establecimiento_nombre ?? "",
    zoneName: row.zona_nombre ?? "",
    workSchedules: row.jornadas ?? "",
    status: row.estado === "I" ? "I" : "A",
  }
}

// `POST /establecimientos/sedes/query`: el SSO pagina y devuelve una sola fila
// con `rows` y los totales; el mock responde con la misma forma.
export async function fetchCampuses(params: CampusesQueryRequest): Promise<CampusesQueryResponse> {
  const [page] = await evalCol.postRows<RealCampusesPage>("/establecimientos/sedes/query", {
    filters: toCampusesQueryFilters(params.filters),
    sorting: toSingleSort(params.sorting),
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
  })
  const totalCount = Number(page?.total_count ?? 0)
  return {
    rows: (page?.rows ?? []).map(toCampusRow),
    totalCount,
    pageCount: page?.page_count != null ? Number(page.page_count) : toPageCount(totalCount, params.pageSize),
  }
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

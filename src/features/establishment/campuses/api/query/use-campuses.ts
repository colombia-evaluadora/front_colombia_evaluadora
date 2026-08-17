import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { toSingleSort } from "@/lib/query-request-mapping"
import { unwrapPaginated } from "@/lib/response-envelope"

import type {
  Campus,
  CampusesQueryRequest,
  CampusesQueryResponse,
} from "@/features/establishment/campuses/api/types/campus"

interface UseCampusesQueryParams {
  filters: CampusesQueryRequest["filters"]
  sorting: CampusesQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

/** Fila cruda de `fn_sed_listar_paginado` (V52) — a diferencia de
 * `fn_sed_listar_todos` (usado en el selector de sedes), esta versión
 * paginada NO trae `barrio`/`comuna`, solo lo que se ve en la tabla. */
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
    // No vienen en este listado (ver comentario de RealCampusRow); solo se
    // completan al abrir el detalle/edición, que sí trae el objeto entero.
    neighborhood: "",
    commune: "",
    address: row.direccion ?? "",
    phone: row.telefono ?? "",
  }
}

async function fetchCampuses(params: CampusesQueryRequest): Promise<CampusesQueryResponse> {
  if (env.ENABLE_API_MOCKING) {
    const response = await api.query(
      apiPath("/establishments/campuses/query", "/establecimientos/sedes/query"),
      params,
    )
    return unwrapPaginated(response)
  }

  // El mock espera `sorting` como array tal cual; el backend real espera un
  // único objeto (o null) — ver `toSingleSort`. `filters.zones` ya trae el
  // `id` como texto (el `<Select>` del buscador manda `String(item.id)`, no
  // el `code` — ver search-campuses.tsx), así que acá solo hace falta
  // convertirlo a número.
  const body = {
    ...params,
    filters: { ...params.filters, zones: (params.filters.zones ?? []).map(Number) },
    sorting: toSingleSort(params.sorting),
  }
  const response = await api.query(
    apiPath("/establishments/campuses/query", "/establecimientos/sedes/query"),
    body,
  )
  const result = unwrapPaginated<RealCampusRow>(response)
  return { ...result, rows: result.rows.map(toCampus) }
}

export const campusesQueryKey = (params: UseCampusesQueryParams) => [
  "campuses",
  params,
]

export function useCampusesQuery(params: UseCampusesQueryParams) {
  return useQuery({
    queryKey: campusesQueryKey(params),
    queryFn: () => fetchCampuses(params),
    placeholderData: (previous) => previous,
  })
}

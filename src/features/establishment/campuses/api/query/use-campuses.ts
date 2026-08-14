import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { toSingleSort } from "@/lib/query-request-mapping"
import { unwrapPaginated } from "@/lib/response-envelope"

import type {
  CampusesQueryRequest,
  CampusesQueryResponse,
} from "@/features/establishment/campuses/api/types/campus"

interface UseCampusesQueryParams {
  filters: CampusesQueryRequest["filters"]
  sorting: CampusesQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

async function fetchCampuses(params: CampusesQueryRequest): Promise<CampusesQueryResponse> {
  // El mock espera `sorting` como array tal cual; el backend real espera un
  // único objeto (o null) — ver `toSingleSort`.
  const body = env.ENABLE_API_MOCKING
    ? params
    : { ...params, sorting: toSingleSort(params.sorting) }
  const response = await api.query(
    apiPath("/establishments/campuses/query", "/establecimientos/sedes/query"),
    body,
  )
  return unwrapPaginated(response)
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
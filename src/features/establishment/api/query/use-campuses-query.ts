import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type {
  CampusesQueryRequest,
  CampusesQueryResponse,
} from "../types/campus"

interface UseCampusesQueryParams {
  filters: CampusesQueryRequest["filters"]
  sorting: CampusesQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

function fetchCampuses(body: CampusesQueryRequest): Promise<CampusesQueryResponse> {
  return api.query("/campuses/query", body)
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
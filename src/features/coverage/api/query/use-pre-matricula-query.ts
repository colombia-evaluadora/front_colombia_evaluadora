import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  PreMatriculaQueryRequest,
  PreMatriculaQueryResponse,
} from "@/features/coverage/api/types/pre-matricula"
import type { ReservationsQueryFilters } from "@/features/coverage/api/types/reservation"

interface UsePreMatriculaQueryParams {
  filters: ReservationsQueryFilters
  sorting: PreMatriculaQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
  enabled?: boolean
}

function fetchPreMatricula(body: PreMatriculaQueryRequest): Promise<PreMatriculaQueryResponse> {
  return api.query("/coverage/pre-matricula/query", body)
}

export const preMatriculaQueryKey = (params: UsePreMatriculaQueryParams) => [
  "pre-matricula",
  params,
]

export function usePreMatriculaQuery(params: UsePreMatriculaQueryParams) {
  const { enabled = true, ...rest } = params
  return useQuery({
    queryKey: preMatriculaQueryKey(params),
    queryFn: () => fetchPreMatricula(rest),
    placeholderData: (previous) => previous,
    enabled,
  })
}

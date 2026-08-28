import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type {
  CurricularReferencesQueryRequest,
  CurricularReferencesQueryResponse,
} from "@/features/academic-management/curricular-references/api/types/curricular-reference"

interface UseCurricularReferencesQueryParams {
  filters: CurricularReferencesQueryRequest["filters"]
  sorting: CurricularReferencesQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

function fetchCurricularReferences(
  params: CurricularReferencesQueryRequest,
): Promise<CurricularReferencesQueryResponse> {
  return api.query("/academic-management/curricular-references/query", params)
}

export const curricularReferencesQueryKey = (params: UseCurricularReferencesQueryParams) => [
  "curricular-references",
  params,
]

export function useCurricularReferencesQuery(params: UseCurricularReferencesQueryParams) {
  return useQuery({
    queryKey: curricularReferencesQueryKey(params),
    queryFn: () => fetchCurricularReferences(params),
    placeholderData: (previous) => previous,
  })
}

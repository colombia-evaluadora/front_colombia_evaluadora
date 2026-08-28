import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  MatriculaQueryRequest,
  MatriculaQueryResponse,
} from "@/features/coverage/api/types/matricula"

interface UseMatriculaQueryParams {
  filters: MatriculaQueryRequest["filters"]
  sorting: MatriculaQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

function fetchMatricula(body: MatriculaQueryRequest): Promise<MatriculaQueryResponse> {
  return api.query("/coverage/matricula/query", body)
}

export const matriculaQueryKey = (params: UseMatriculaQueryParams) => ["matricula", params]

export function useMatriculaQuery(params: UseMatriculaQueryParams) {
  return useQuery({
    queryKey: matriculaQueryKey(params),
    queryFn: () => fetchMatricula(params),
    placeholderData: (previous) => previous,
  })
}

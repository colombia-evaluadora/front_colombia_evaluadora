import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  GradesQueryRequest,
  GradesQueryResponse,
} from "@/features/establishment/academic-period/api/types/grade"

interface UseGradesQueryParams {
  filters: GradesQueryRequest["filters"]
  sorting: GradesQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
  academicPeriodId?: number
}

function fetchGrades(body: GradesQueryRequest): Promise<GradesQueryResponse> {
  return api.query("/grades/query", body)
}

export const gradesQueryKey = (params: UseGradesQueryParams) => [
  "grades",
  params,
]

export function useGradesQuery(params: UseGradesQueryParams) {
  return useQuery({
    queryKey: gradesQueryKey(params),
    queryFn: () => fetchGrades(params),
    placeholderData: (previous) => previous,
  })
}

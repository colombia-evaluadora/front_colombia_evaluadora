import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  EvaluationPeriodsQueryResponse,
  EvaluationPeriodsQueryRequest,
} from "../types/academic-period/evaluation-period"

interface UseAcademicPeriodsQueryParams {
  filters: EvaluationPeriodsQueryRequest["filters"]
  sorting: EvaluationPeriodsQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

function fetchAcademicPeriods(
  body: EvaluationPeriodsQueryRequest
): Promise<EvaluationPeriodsQueryResponse> {
  return api.query("/evaluation-periods/query", body)
}

export const evaluationPeriodsQueryKey = (
  params: UseAcademicPeriodsQueryParams
) => ["academic-periods", params]

export function useEvaluationPeriodsQuery(params: UseAcademicPeriodsQueryParams) {
  return useQuery({
    queryKey: evaluationPeriodsQueryKey(params),
    queryFn: () => fetchAcademicPeriods(params),
    placeholderData: (previous) => previous,
  })
}

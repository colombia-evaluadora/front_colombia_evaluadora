import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  EvaluationPeriodsQueryResponse,
  EvaluationPeriodsQueryRequest,
} from "@/features/establishment/academic-period/api/types/evaluation-period"

interface UseEvaluationPeriodsQueryParams {
  filters: EvaluationPeriodsQueryRequest["filters"]
  sorting: EvaluationPeriodsQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
  academicPeriodId?: number
}

function fetchEvaluationPeriods(
  body: EvaluationPeriodsQueryRequest
): Promise<EvaluationPeriodsQueryResponse> {
  return api.query("/evaluation-periods/query", body)
}

export const evaluationPeriodsQueryKey = (
  params: UseEvaluationPeriodsQueryParams
) => ["evaluation-periods", params]

export function useEvaluationPeriodsQuery(
  params: UseEvaluationPeriodsQueryParams
) {
  return useQuery({
    queryKey: evaluationPeriodsQueryKey(params),
    queryFn: () => fetchEvaluationPeriods(params),
    placeholderData: (previous) => previous,
  })
}

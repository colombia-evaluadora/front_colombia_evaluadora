import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { EvaluationPeriodStatusOption } from "@/features/establishment/academic-period/api/types/evaluation-period"

function fetchEvaluationPeriodStatuses(): Promise<EvaluationPeriodStatusOption[]> {
  return api.get("/evaluation-period-statuses")
}

export const evaluationPeriodStatusesQueryKey = () => ["evaluation-period-statuses"]

export function useEvaluationPeriodStatusesQuery() {
  return useQuery({
    queryKey: evaluationPeriodStatusesQueryKey(),
    queryFn: fetchEvaluationPeriodStatuses,
    staleTime: Infinity,
  })
}

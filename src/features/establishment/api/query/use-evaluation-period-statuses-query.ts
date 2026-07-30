import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { EvaluationPeriodStatus } from "../types/academic-period/evaluation-period"

function fetchEvaluationPeriodStatuses(): Promise<EvaluationPeriodStatus[]> {
  return api.get("/evaluation-period-statuses")
}

export const evaluationPeriodStatusesQueryKey = () => [
  "evaluation-period-statuses",
]

export function useEvaluationPeriodStatusesQuery() {
  return useQuery({
    queryKey: evaluationPeriodStatusesQueryKey(),
    queryFn: fetchEvaluationPeriodStatuses,
    staleTime: Infinity,
  })
}
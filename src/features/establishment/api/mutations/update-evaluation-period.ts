import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  MutationResult,
  UpdateEvaluationPeriodRequest,
} from "../types/academic-period/evaluation-period"

interface UpdateEvaluationPeriodInput {
  academicPeriodId?: number
  codigo: number
  values: UpdateEvaluationPeriodRequest
}

function updateEvaluationPeriod({
  academicPeriodId,
  codigo,
  values,
}: UpdateEvaluationPeriodInput): Promise<MutationResult> {
  return api.patch(`/evaluation-periods/${codigo}`, {
    ...values,
    academicPeriodId,
  })
}

interface UseUpdateEvaluationPeriodOptions {
  mutationConfig?: MutationConfig<typeof updateEvaluationPeriod>
}

export function useUpdateEvaluationPeriod({
  mutationConfig,
}: UseUpdateEvaluationPeriodOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateEvaluationPeriod,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-periods"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

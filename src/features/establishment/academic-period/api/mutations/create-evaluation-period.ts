import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  CreateEvaluationPeriodRequest,
  EvaluationPeriod,
} from "@/features/establishment/academic-period/types/evaluation-period"

function createEvaluationPeriod(
  input: CreateEvaluationPeriodRequest
): Promise<EvaluationPeriod> {
  return api.post("/evaluation-periods", input)
}

interface UseCreateEvaluationPeriodOptions {
  mutationConfig?: MutationConfig<typeof createEvaluationPeriod>
}

export function useCreateEvaluationPeriod({
  mutationConfig,
}: UseCreateEvaluationPeriodOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createEvaluationPeriod,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-periods"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

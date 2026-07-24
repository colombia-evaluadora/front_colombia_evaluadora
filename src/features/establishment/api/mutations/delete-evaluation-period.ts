import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "../types/academic-period/evaluation-period"

function deleteEvaluationPeriod(codigo: number): Promise<MutationResult> {
  return api.delete(`/evaluation-periods/${codigo}`)
}

interface UseDeleteEvaluationPeriodOptions {
  mutationConfig?: MutationConfig<typeof deleteEvaluationPeriod>
}

export function useDeleteEvaluationPeriod({
  mutationConfig,
}: UseDeleteEvaluationPeriodOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteEvaluationPeriod,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-periods"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

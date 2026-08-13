import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "@/features/establishment/academic-period/api/types/evaluation-period"

// Borrado en lote por códigos, en una sola request atómica.
function deleteEvaluationPeriodsBulk(ids: number[]): Promise<MutationResult> {
  return api.post("/evaluation-periods/bulk-delete", { ids })
}

interface UseDeleteEvaluationPeriodsBulkOptions {
  mutationConfig?: MutationConfig<typeof deleteEvaluationPeriodsBulk>
}

export function useDeleteEvaluationPeriodsBulk({
  mutationConfig,
}: UseDeleteEvaluationPeriodsBulkOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteEvaluationPeriodsBulk,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-periods"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

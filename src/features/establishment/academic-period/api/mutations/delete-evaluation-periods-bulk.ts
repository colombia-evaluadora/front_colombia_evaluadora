import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { BulkDeleteResult } from "@/features/establishment/academic-period/api/mutations/bulk-delete-result"

// Borrado en lote por PK, en una sola request atómica (`fn_periodo_eval_bulk_delete`).
function deleteEvaluationPeriodsBulk(ids: number[]): Promise<BulkDeleteResult> {
  return api.post("/eval-col/periodo-evaluacion/bulk-delete", { IDS: ids })
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

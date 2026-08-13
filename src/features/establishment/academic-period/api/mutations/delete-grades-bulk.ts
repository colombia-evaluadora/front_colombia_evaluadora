import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "@/features/establishment/academic-period/types/grade"

// Borrado en lote por ids, en una sola request atómica.
function deleteGradesBulk(ids: number[]): Promise<MutationResult> {
  return api.post("/grades/bulk-delete", { ids })
}

interface UseDeleteGradesBulkOptions {
  mutationConfig?: MutationConfig<typeof deleteGradesBulk>
}

export function useDeleteGradesBulk({
  mutationConfig,
}: UseDeleteGradesBulkOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteGradesBulk,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["grades"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

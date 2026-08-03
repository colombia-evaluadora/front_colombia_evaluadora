import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "../../types/academic-period"

// Borrado en lote por ids, en una sola request atómica.
function deleteAcademicPeriodsBulk(ids: number[]): Promise<MutationResult> {
  return api.post("/academic-periods/bulk-delete", { ids })
}

interface UseDeleteAcademicPeriodsBulkOptions {
  mutationConfig?: MutationConfig<typeof deleteAcademicPeriodsBulk>
}

export function useDeleteAcademicPeriodsBulk({
  mutationConfig,
}: UseDeleteAcademicPeriodsBulkOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteAcademicPeriodsBulk,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["academic-periods"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

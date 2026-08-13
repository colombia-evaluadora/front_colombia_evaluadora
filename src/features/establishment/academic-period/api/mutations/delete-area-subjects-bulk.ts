import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "@/features/establishment/academic-period/types/area-subject"

// Borrado en lote por códigos, en una sola request atómica.
function deleteAreaSubjectsBulk(ids: number[]): Promise<MutationResult> {
  return api.post("/area-subjects/bulk-delete", { ids })
}

interface UseDeleteAreaSubjectsBulkOptions {
  mutationConfig?: MutationConfig<typeof deleteAreaSubjectsBulk>
}

export function useDeleteAreaSubjectsBulk({
  mutationConfig,
}: UseDeleteAreaSubjectsBulkOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteAreaSubjectsBulk,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["area-subjects"] })
      queryClient.invalidateQueries({ queryKey: ["subjects"] })
      queryClient.invalidateQueries({ queryKey: ["especialidades"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

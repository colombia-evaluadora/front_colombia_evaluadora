import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "../../types/rating-scales"

// Borrado en lote por códigos, en una sola request atómica.
function deleteRatingScalesBulk(ids: number[]): Promise<MutationResult> {
  return api.post("/rating-scales/bulk-delete", { ids })
}

interface UseDeleteRatingScalesBulkOptions {
  mutationConfig?: MutationConfig<typeof deleteRatingScalesBulk>
}

export function useDeleteRatingScalesBulk({
  mutationConfig,
}: UseDeleteRatingScalesBulkOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteRatingScalesBulk,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["rating-scales"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

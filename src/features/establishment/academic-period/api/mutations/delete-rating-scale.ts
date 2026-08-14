import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "@/features/establishment/academic-period/api/types/rating-scales"

function deleteRatingScale(codigo: number): Promise<MutationResult> {
  return api.delete(`/rating-scales/${codigo}`)
}

interface UseDeleteRatingScaleOptions {
  mutationConfig?: MutationConfig<typeof deleteRatingScale>
}

export function useDeleteRatingScale({ mutationConfig }: UseDeleteRatingScaleOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteRatingScale,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["rating-scales"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  BulkCreateRatingScalesRequest,
  RatingScale,
} from "../../types/rating-scales"

// Alta en lote: el backend expande por nivel de enseñanza y asigna los códigos.
function createRatingScalesBulk(
  input: BulkCreateRatingScalesRequest
): Promise<RatingScale[]> {
  return api.post("/rating-scales/bulk", input)
}

interface UseCreateRatingScalesBulkOptions {
  mutationConfig?: MutationConfig<typeof createRatingScalesBulk>
}

export function useCreateRatingScalesBulk({
  mutationConfig,
}: UseCreateRatingScalesBulkOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createRatingScalesBulk,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["rating-scales"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

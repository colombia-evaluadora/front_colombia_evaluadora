import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  CreateRatingScaleRequest,
  RatingScale,
} from "../types/academic-period/rating-scales"

function createRatingScale(
  input: CreateRatingScaleRequest
): Promise<RatingScale> {
  return api.post("/rating-scales", input)
}

interface UseCreateRatingScaleOptions {
  mutationConfig?: MutationConfig<typeof createRatingScale>
}

export function useCreateRatingScale({
  mutationConfig,
}: UseCreateRatingScaleOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createRatingScale,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["rating-scales"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

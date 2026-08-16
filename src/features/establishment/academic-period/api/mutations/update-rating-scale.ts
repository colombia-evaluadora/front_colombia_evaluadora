import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  MutationResult,
  UpdateRatingScaleRequest,
} from "@/features/establishment/academic-period/api/types/rating-scales"

interface UpdateRatingScaleInput {
  codigo: number
  values: UpdateRatingScaleRequest
}

function updateRatingScale({ codigo, values }: UpdateRatingScaleInput): Promise<MutationResult> {
  return api.patch(`/rating-scales/${codigo}`, values)
}

interface UseUpdateRatingScaleOptions {
  mutationConfig?: MutationConfig<typeof updateRatingScale>
}

export function useUpdateRatingScale({ mutationConfig }: UseUpdateRatingScaleOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateRatingScale,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["rating-scales"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

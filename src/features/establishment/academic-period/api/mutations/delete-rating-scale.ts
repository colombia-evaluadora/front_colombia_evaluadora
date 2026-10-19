import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "@/features/establishment/academic-period/api/types/rating-scales"
import { invalidateRatingScaleRelated } from "./invalidate"

// `fn_escala_eliminar` (id_query 54); el SSO no admite DELETE.
function deleteRatingScale(codigo: number): Promise<MutationResult> {
  return api.put(`/eval-col/escalas/${codigo}`)
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
      invalidateRatingScaleRelated(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

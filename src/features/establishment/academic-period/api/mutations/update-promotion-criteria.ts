import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  MutationResult,
  PromotionCriteria,
} from "@/features/establishment/academic-period/types/promotion-criteria"

interface UpdatePromotionCriteriaInput {
  academicPeriodId: number
  values: PromotionCriteria
}

function updatePromotionCriteria({
  academicPeriodId,
  values,
}: UpdatePromotionCriteriaInput): Promise<MutationResult> {
  return api.patch(`/promotion-criteria/${academicPeriodId}`, values)
}

interface UseUpdatePromotionCriteriaOptions {
  mutationConfig?: MutationConfig<typeof updatePromotionCriteria>
}

export function useUpdatePromotionCriteria({
  mutationConfig,
}: UseUpdatePromotionCriteriaOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updatePromotionCriteria,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["promotion-criteria"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

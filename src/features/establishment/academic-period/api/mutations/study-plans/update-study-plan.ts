import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  MutationResult,
  UpdateStudyPlanItemRequest,
} from "../../types/study-plan"

interface UpdateStudyPlanItemInput {
  codigo: number
  values: UpdateStudyPlanItemRequest
}

function updateStudyPlanItem({
  codigo,
  values,
}: UpdateStudyPlanItemInput): Promise<MutationResult> {
  return api.patch(`/study-plans/${codigo}`, values)
}

interface UseUpdateStudyPlanItemOptions {
  mutationConfig?: MutationConfig<typeof updateStudyPlanItem>
}

export function useUpdateStudyPlanItem({
  mutationConfig,
}: UseUpdateStudyPlanItemOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateStudyPlanItem,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["study-plans"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

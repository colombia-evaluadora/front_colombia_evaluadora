import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  CreateStudyPlanItemRequest,
  StudyPlanItem,
} from "@/features/establishment/academic-period/types/study-plan"

function createStudyPlanItem(
  input: CreateStudyPlanItemRequest
): Promise<StudyPlanItem> {
  return api.post("/study-plans", input)
}

interface UseCreateStudyPlanItemOptions {
  mutationConfig?: MutationConfig<typeof createStudyPlanItem>
}

export function useCreateStudyPlanItem({
  mutationConfig,
}: UseCreateStudyPlanItemOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createStudyPlanItem,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["study-plans"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

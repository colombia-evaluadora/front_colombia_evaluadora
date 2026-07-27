import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "../types/academic-period/study-plan"

function deleteStudyPlanItem(codigo: number): Promise<MutationResult> {
  return api.delete(`/study-plans/${codigo}`)
}

interface UseDeleteStudyPlanItemOptions {
  mutationConfig?: MutationConfig<typeof deleteStudyPlanItem>
}

export function useDeleteStudyPlanItem({
  mutationConfig,
}: UseDeleteStudyPlanItemOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteStudyPlanItem,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["study-plans"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

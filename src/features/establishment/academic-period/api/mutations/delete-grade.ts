import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "@/features/establishment/academic-period/api/types/grade"

function deleteGrade(id: number): Promise<MutationResult> {
  return api.delete(`/grades/${id}`)
}

interface UseDeleteGradeOptions {
  mutationConfig?: MutationConfig<typeof deleteGrade>
}

export function useDeleteGrade({ mutationConfig }: UseDeleteGradeOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteGrade,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["grades"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

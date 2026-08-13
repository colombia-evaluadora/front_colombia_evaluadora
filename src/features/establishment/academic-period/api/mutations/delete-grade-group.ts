import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "@/features/establishment/academic-period/api/types/grade-group"

function deleteGradeGroup(codigo: string): Promise<MutationResult> {
  return api.delete(`/grade-groups/${encodeURIComponent(codigo)}`)
}

interface UseDeleteGradeGroupOptions {
  mutationConfig?: MutationConfig<typeof deleteGradeGroup>
}

export function useDeleteGradeGroup({
  mutationConfig,
}: UseDeleteGradeGroupOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteGradeGroup,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["grade-groups"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "@/features/establishment/academic-period/api/types/grade-group"
import { invalidateGradeGroupRelated } from "./invalidate"

// `fn_grupo_soft_delete` (id_query 64, PUT desde V68); usa el PK real.
function deleteGradeGroup(id: number): Promise<MutationResult> {
  return api.put(`/eval-col/grupos/${id}/eliminar`)
}

interface UseDeleteGradeGroupOptions {
  mutationConfig?: MutationConfig<typeof deleteGradeGroup>
}

export function useDeleteGradeGroup({ mutationConfig }: UseDeleteGradeGroupOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteGradeGroup,
    ...mutationConfig,
    onSuccess: (...args) => {
      invalidateGradeGroupRelated(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

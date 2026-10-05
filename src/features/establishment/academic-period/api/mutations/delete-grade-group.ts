import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "@/features/establishment/academic-period/api/types/grade-group"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"

// `PUT /eval-col/grupos/:ID/eliminar` (`fn_grupo_soft_delete`, id_query 64 —
// PUT desde V68). Usa el PK real, no `codigo`.
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
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.gradeGroups.all })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

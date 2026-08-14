import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "@/features/establishment/academic-period/api/types/grade"

// `PUT /eval-col/grados/:ID/eliminar` (`fn_grado_soft_delete`, id_query 59 —
// PUT desde V67). DELETE no está permitido en el catálogo del SSO.
function deleteGrade(id: number): Promise<MutationResult> {
  return api.put(`/eval-col/grados/${id}/eliminar`)
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

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "@/features/establishment/academic-period/api/types/grade"

// `PUT /eval-col/grados/eliminacion-masiva` (`fn_grado_bulk_delete`,
// id_query 69 — PUT desde V67, no PATCH). Body espera `IDS` (mayúsculas).
function deleteGradesBulk(ids: number[]): Promise<MutationResult> {
  return api.put("/eval-col/grados/eliminacion-masiva", { IDS: ids })
}

interface UseDeleteGradesBulkOptions {
  mutationConfig?: MutationConfig<typeof deleteGradesBulk>
}

export function useDeleteGradesBulk({
  mutationConfig,
}: UseDeleteGradesBulkOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteGradesBulk,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["grades"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { BulkDeleteResult } from "@/features/establishment/academic-period/api/utils/bulk-delete-result"
import { invalidateGradeRelated } from "./invalidate"

// `fn_grado_bulk_delete` (id_query 69, PUT desde V67); body con `IDS`.
function deleteGradesBulk(ids: number[]): Promise<BulkDeleteResult> {
  return api.put("/eval-col/grados/eliminacion-masiva", { IDS: ids })
}

interface UseDeleteGradesBulkOptions {
  mutationConfig?: MutationConfig<typeof deleteGradesBulk>
}

export function useDeleteGradesBulk({ mutationConfig }: UseDeleteGradesBulkOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteGradesBulk,
    ...mutationConfig,
    onSuccess: (...args) => {
      invalidateGradeRelated(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { BulkDeleteResult } from "@/features/establishment/academic-period/api/mutations/bulk-delete-result"

interface DeleteGradeGroupsBulkInput {
  ids: number[]
}

// `POST /eval-col/grupos/bulk-delete` (`fn_grupo_bulk_delete`).
function deleteGradeGroupsBulk({ ids }: DeleteGradeGroupsBulkInput): Promise<BulkDeleteResult> {
  return api.post("/eval-col/grupos/bulk-delete", { IDS: ids })
}

interface UseDeleteGradeGroupsBulkOptions {
  mutationConfig?: MutationConfig<typeof deleteGradeGroupsBulk>
}

export function useDeleteGradeGroupsBulk({ mutationConfig }: UseDeleteGradeGroupsBulkOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteGradeGroupsBulk,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["grade-groups"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

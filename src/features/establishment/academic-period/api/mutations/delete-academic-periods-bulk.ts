import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { BulkDeleteResult } from "@/features/establishment/academic-period/api/utils/bulk-delete-result"
import { invalidateAcademicPeriodRelated } from "./invalidate"

// `fn_periodo_bulk_delete`, atómico, expuesto como PUT.
function deleteAcademicPeriodsBulk(ids: number[]): Promise<BulkDeleteResult> {
  return api.put("/eval-col/periodos-academicos", { IDS: ids })
}

interface UseDeleteAcademicPeriodsBulkOptions {
  mutationConfig?: MutationConfig<typeof deleteAcademicPeriodsBulk>
}

export function useDeleteAcademicPeriodsBulk({
  mutationConfig,
}: UseDeleteAcademicPeriodsBulkOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteAcademicPeriodsBulk,
    ...mutationConfig,
    onSuccess: (...args) => {
      invalidateAcademicPeriodRelated(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

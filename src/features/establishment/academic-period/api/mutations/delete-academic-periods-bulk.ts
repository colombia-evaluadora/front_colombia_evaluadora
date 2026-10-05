import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { BulkDeleteResult } from "@/features/establishment/academic-period/api/mutations/bulk-delete-result"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"

// Borrado en lote por ids, en una sola request atómica
// (`fn_periodo_bulk_delete`, expuesto como PUT `/periodos-academicos`).
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
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.academicPeriods.all })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { invalidateCampuses } from "@/features/establishment/campuses/api/mutations/invalidate-campuses"
import type { MutationConfig } from "@/lib/react-query"
import {
  createBulkDeleteFn,
  summarizeEntityBulkDelete,
  type BulkDeleteEntityResult,
  type BulkDeleteEntityRow,
  type BulkDeleteEntitySummary,
} from "@/features/establishment/shared/api/bulk-delete"

// Una fila por id, sin envelope (contrato asumido igual al bulk de funcionarios).
export type BulkDeleteCampusRow = BulkDeleteEntityRow<"pk_sede">
export type BulkDeleteCampusResult = BulkDeleteEntityResult<"pk_sede">
export type BulkDeleteCampusSummary = BulkDeleteEntitySummary

/** Real: PUT con `{ pks }` (borrado lógico). */
const bulkDeleteCampuses = createBulkDeleteFn<BulkDeleteCampusResult>({
  mockUrl: "/establishments/campuses/bulk-delete",
  realUrl: "/eval-col/establecimientos/sedes/bulk-delete",
  realMethod: "put",
})

export function summarizeCampusBulkDelete(
  result: BulkDeleteCampusResult
): BulkDeleteCampusSummary {
  return summarizeEntityBulkDelete(result, "pk_sede")
}

interface UseBulkDeleteOptions {
  mutationConfig?: MutationConfig<typeof bulkDeleteCampuses>
}

export function useBulkDelete({
  mutationConfig,
}: UseBulkDeleteOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: bulkDeleteCampuses,
    ...mutationConfig,
    onSuccess: (...args) => {
      invalidateCampuses(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

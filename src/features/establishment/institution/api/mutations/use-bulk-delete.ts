import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"
import { establishmentKeys } from "@/features/establishment/institution/api/query-keys"
import {
  createBulkDeleteFn,
  summarizeEntityBulkDelete,
  type BulkDeleteEntityResult,
  type BulkDeleteEntityRow,
  type BulkDeleteEntitySummary,
} from "@/features/establishment/shared/api/bulk-delete"

// Se asume el contrato de `fn_fun_baja_establecimiento_bulk` (fila por id); sin confirmar.
export type BulkDeleteEstablishmentRow = BulkDeleteEntityRow<"pk_establecimiento">
export type BulkDeleteEstablishmentResult = BulkDeleteEntityResult<"pk_establecimiento">
export type BulkDeleteEstablishmentSummary = BulkDeleteEntitySummary

const bulkDeleteEstablishments = createBulkDeleteFn<BulkDeleteEstablishmentResult>({
  mockUrl: "/establishments/bulk-delete",
  realUrl: "/eval-col/establecimientos/bulk-delete",
  realMethod: "post",
})

export function summarizeEstablishmentBulkDelete(
  result: BulkDeleteEstablishmentResult
): BulkDeleteEstablishmentSummary {
  return summarizeEntityBulkDelete(result, "pk_establecimiento")
}

interface UseBulkDeleteOptions {
  mutationConfig?: MutationConfig<typeof bulkDeleteEstablishments>
}

export function useBulkDelete({
  mutationConfig,
}: UseBulkDeleteOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: bulkDeleteEstablishments,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: establishmentKeys.all })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

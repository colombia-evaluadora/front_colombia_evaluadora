import { useMutation, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { establishmentKeys } from "@/features/establishment/institution/api/query-keys"

// Se asume el contrato de `fn_fun_baja_establecimiento_bulk` (fila por id); sin confirmar.
export interface BulkDeleteEstablishmentRow {
  pk_establecimiento: string
  status: string
}

export interface BulkDeleteEstablishmentResult {
  rows: BulkDeleteEstablishmentRow[]
}

// Real: POST con `{ pks }`; el mock espera array plano vía DELETE.
function bulkDeleteEstablishments(ids: number[]): Promise<BulkDeleteEstablishmentResult> {
  if (env.ENABLE_API_MOCKING) {
    // `api.delete(url, body)` no existe en la firma estándar de axios.
    return api.request<BulkDeleteEstablishmentResult>({
      method: "DELETE",
      url: "/establishments/bulk-delete",
      data: ids,
    }) as unknown as Promise<BulkDeleteEstablishmentResult>
  }
  return api.post("/eval-col/establecimientos/bulk-delete", { pks: ids })
}

export interface BulkDeleteEstablishmentSummary {
  succeededCount: number
  failed: { id: string; reason: string }[]
}

export function summarizeEstablishmentBulkDelete(
  result: BulkDeleteEstablishmentResult
): BulkDeleteEstablishmentSummary {
  const failed: BulkDeleteEstablishmentSummary["failed"] = []
  let succeededCount = 0
  for (const row of result.rows) {
    if (row.status === "eliminado") {
      succeededCount += 1
    } else {
      const reason = row.status.startsWith("error:")
        ? row.status.slice("error:".length)
        : row.status
      failed.push({ id: row.pk_establecimiento, reason })
    }
  }
  return { succeededCount, failed }
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
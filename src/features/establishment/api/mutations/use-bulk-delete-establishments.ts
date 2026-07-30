import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

export interface BulkDeleteEstablishmentResult {
  status: "ok" | "error"
  message: string
  deletedCount: number
}

// El backend espera los ids en el body de un DELETE. Axios requiere
// `api.request({ method: "DELETE", data })` para adjuntar el payload —
// `api.delete(url, body)` no existe en la firma estándar.
function bulkDeleteEstablishments(ids: string[]): Promise<BulkDeleteEstablishmentResult> {
  return api.request<BulkDeleteEstablishmentResult>({
    method: "DELETE",
    url: "/establishments/bulk-delete",
    data: ids,
  }) as unknown as Promise<BulkDeleteEstablishmentResult>
}

interface UseBulkDeleteEstablishmentsOptions {
  mutationConfig?: MutationConfig<typeof bulkDeleteEstablishments>
}

export function useBulkDeleteEstablishments({
  mutationConfig,
}: UseBulkDeleteEstablishmentsOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: bulkDeleteEstablishments,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["establishments"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
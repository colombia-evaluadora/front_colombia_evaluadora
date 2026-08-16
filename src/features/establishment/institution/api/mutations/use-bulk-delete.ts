import { useMutation, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

export interface BulkDeleteEstablishmentResult {
  status: "ok" | "error"
  message: string
  deletedCount: number
}

/**
 * El SSO real registra esto como `POST /establecimientos/bulk-delete`
 * (llama a `fn_est_soft_delete_bulk`, borrado lógico), con los ids en
 * `{ pks: [...] }` — no un array plano en el body de un DELETE como hace
 * el mock. El mock sigue esperando el array plano vía DELETE (no se tocó
 * ese handler); acá solo se resuelve distinto según el modo.
 */
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
      queryClient.invalidateQueries({ queryKey: ["establishments"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
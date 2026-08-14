import { useMutation, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

export interface BulkDeleteCampusResult {
  status: "ok" | "error"
  message: string
  deletedCount: number
}

/**
 * El SSO real registra esto como `PUT /establecimientos/sedes/bulk-delete`
 * (`fn_sed_soft_delete_bulk`, borrado lógico) con los ids en
 * `{ pks: [...] }`, no un array plano en el body de un DELETE.
 */
function bulkDeleteCampuses(ids: number[]): Promise<BulkDeleteCampusResult> {
  if (env.ENABLE_API_MOCKING) {
    // `api.delete(url, body)` no existe en la firma estándar de axios.
    return api.request<BulkDeleteCampusResult>({
      method: "DELETE",
      url: "/establishments/campuses/bulk-delete",
      data: ids,
    }) as unknown as Promise<BulkDeleteCampusResult>
  }
  return api.put("/establecimientos/sedes/bulk-delete", { pks: ids })
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
      queryClient.invalidateQueries({ queryKey: ["campuses"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
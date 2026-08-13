import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

export interface BulkDeleteCampusResult {
  status: "ok" | "error"
  message: string
  deletedCount: number
}

function bulkDeleteCampuses(ids: number[]): Promise<BulkDeleteCampusResult> {
  return api.request<BulkDeleteCampusResult>({
    method: "DELETE",
    url: "/establishments/campuses/bulk-delete",
    data: ids,
  }) as unknown as Promise<BulkDeleteCampusResult>
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
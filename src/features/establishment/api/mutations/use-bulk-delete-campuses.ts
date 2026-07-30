import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

export interface BulkDeleteCampusResult {
  status: "ok" | "error"
  message: string
  deletedCount: number
}

function bulkDeleteCampuses(ids: string[]): Promise<BulkDeleteCampusResult> {
  return api.request<BulkDeleteCampusResult>({
    method: "DELETE",
    url: "/establishments/campuses/bulk-delete",
    data: ids,
  }) as unknown as Promise<BulkDeleteCampusResult>
}

interface UseBulkDeleteCampusesOptions {
  mutationConfig?: MutationConfig<typeof bulkDeleteCampuses>
}

export function useBulkDeleteCampuses({
  mutationConfig,
}: UseBulkDeleteCampusesOptions = {}) {
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
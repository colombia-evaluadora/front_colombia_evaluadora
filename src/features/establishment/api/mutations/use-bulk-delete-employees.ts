import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

export interface BulkDeleteEmployeeResult {
  status: "ok" | "error"
  message: string
  deletedCount: number
}

function bulkDeleteEmployees(ids: string[]): Promise<BulkDeleteEmployeeResult> {
  return api.request<BulkDeleteEmployeeResult>({
    method: "DELETE",
    url: "/establishments/employees/bulk-delete",
    data: ids,
  }) as unknown as Promise<BulkDeleteEmployeeResult>
}

interface UseBulkDeleteEmployeesOptions {
  mutationConfig?: MutationConfig<typeof bulkDeleteEmployees>
}

export function useBulkDeleteEmployees({
  mutationConfig,
}: UseBulkDeleteEmployeesOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: bulkDeleteEmployees,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
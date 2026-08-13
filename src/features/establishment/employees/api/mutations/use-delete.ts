import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

export interface DeleteEmployeeResult {
  status: "ok" | "error"
  message: string
}

function deleteEmployee(id: number): Promise<DeleteEmployeeResult> {
  return api.delete(`/establishments/employees/${id}`)
}

interface UseDeleteOptions {
  mutationConfig?: MutationConfig<typeof deleteEmployee>
}

export function useDelete({ mutationConfig }: UseDeleteOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteEmployee,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

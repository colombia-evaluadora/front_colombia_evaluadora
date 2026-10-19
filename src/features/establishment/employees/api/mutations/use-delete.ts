import { useMutation, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import type { MutationConfig } from "@/lib/react-query"
import { employeeKeys } from "@/features/establishment/employees/api/query-keys"

export interface DeleteEmployeeResult {
  status: "ok" | "error"
  message: string
}

// PUT: es baja lógica (`fn_fun_baja_establecimiento`).
function deleteEmployee(id: number): Promise<DeleteEmployeeResult> {
  const url = apiPath(`/establishments/employees/${id}`, `/establecimientos/funcionarios/${id}`)
  return env.ENABLE_API_MOCKING ? api.delete(url) : api.put(url)
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
      queryClient.invalidateQueries({ queryKey: employeeKeys.all })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

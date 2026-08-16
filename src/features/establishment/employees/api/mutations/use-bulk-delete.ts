import { useMutation, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

export interface BulkDeleteEmployeeResult {
  status: "ok" | "error"
  message: string
  deletedCount: number
}

/**
 * Pensado como `PUT /establecimientos/funcionarios/eliminar-multiple`
 * (`fn_fun_baja_establecimiento_bulk`, baja lógica) con los ids en
 * `{ pks: [...] }` — mismo formato que ya usan en vivo
 * `/establecimientos/bulk-delete` y `/establecimientos/sedes/bulk-delete`.
 * Ver postgres/pending/step4_funcionarios_listar_y_baja.sql (todavía sin
 * aplicar; ese pending ya se actualizó para esperar `pks`, no un array
 * plano).
 */
function bulkDeleteEmployees(ids: number[]): Promise<BulkDeleteEmployeeResult> {
  if (env.ENABLE_API_MOCKING) {
    return api.request<BulkDeleteEmployeeResult>({
      method: "DELETE",
      url: "/establishments/employees/bulk-delete",
      data: ids,
    }) as unknown as Promise<BulkDeleteEmployeeResult>
  }
  return api.put("/eval-col/establecimientos/funcionarios/eliminar-multiple", { pks: ids })
}

interface UseBulkDeleteOptions {
  mutationConfig?: MutationConfig<typeof bulkDeleteEmployees>
}

export function useBulkDelete({
  mutationConfig,
}: UseBulkDeleteOptions = {}) {
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
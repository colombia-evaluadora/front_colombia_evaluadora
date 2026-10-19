import { useMutation, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { employeeKeys } from "@/features/establishment/employees/api/query-keys"

// Sin envelope: cada id trae su fila; `pk_funcionario` llega como texto.
// Todo `status` distinto de "eliminado" es fallo (razones no cerradas).
export interface BulkDeleteEmployeeRow {
  pk_funcionario: string
  status: string
}

export interface BulkDeleteEmployeeResult {
  rows: BulkDeleteEmployeeRow[]
}

/** Baja lógica con `{ pks: [...] }`, como los demás bulk-delete. */
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

const REASON_MESSAGES: Record<string, string> = {
  sin_establecimiento: "no pertenece a este establecimiento",
  no_encontrado: "no se encontró",
}

function reasonMessage(status: string): string {
  const reason = status.startsWith("error:") ? status.slice("error:".length) : status
  return REASON_MESSAGES[reason] ?? "no se pudo eliminar"
}

export interface BulkDeleteEmployeeSummary {
  succeededCount: number
  failed: { id: string; reason: string }[]
}

export function summarizeEmployeeBulkDelete(
  result: BulkDeleteEmployeeResult
): BulkDeleteEmployeeSummary {
  const failed: BulkDeleteEmployeeSummary["failed"] = []
  let succeededCount = 0
  for (const row of result.rows) {
    if (row.status === "eliminado") {
      succeededCount += 1
    } else {
      failed.push({ id: row.pk_funcionario, reason: reasonMessage(row.status) })
    }
  }
  return { succeededCount, failed }
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
      queryClient.invalidateQueries({ queryKey: employeeKeys.all })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
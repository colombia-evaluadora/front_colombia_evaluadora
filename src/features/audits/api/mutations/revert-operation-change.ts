import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  RevertOperationChangeInput,
  RevertOperationChangeResponse,
} from "../types/audit-table"

interface RevertOperationChangeVariables {
  tableSlug: string
  operationId: string
  // Lista de campos a revertir: el botón del dialog manda todos los que
  // muestra, pero el contrato del backend acepta cualquier subset.
  fieldIndexes: number[]
}

function revertOperationChange({
  tableSlug,
  operationId,
  fieldIndexes,
}: RevertOperationChangeVariables): Promise<RevertOperationChangeResponse> {
  const body: RevertOperationChangeInput = {
    tableSlug,
    operationId,
    changes: fieldIndexes.map((fieldIndex) => ({ fieldIndex })),
  }
  return api.post(
    `/audit-tables/${tableSlug}/operations/${operationId}/changes/revert`,
    body
  )
}

interface UseRevertOperationChangeOptions {
  mutationConfig?: MutationConfig<typeof revertOperationChange>
}

export function useRevertOperationChange({
  mutationConfig,
}: UseRevertOperationChangeOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: revertOperationChange,
    // Refresca el detalle de cambios después de revertir para que la UI
    // muestre los campos como "ya revertidos" (before === after).
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({
        queryKey: [
          "audit-tables",
          variables.tableSlug,
          "operations",
          variables.operationId,
          "changes",
        ],
      })
      mutationConfig?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...mutationConfig,
  })
}
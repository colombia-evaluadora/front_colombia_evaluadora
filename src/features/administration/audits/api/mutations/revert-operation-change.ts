import { useMutation, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  RevertOperationChangeInput,
  RevertOperationChangeResponse,
} from "@/features/administration/audits/api/types/audit-table"

interface RevertOperationChangeVariables {
  tableSlug: string
  operationId: string
  // Lista de campos a revertir: el botón del dialog manda todos los que
  // muestra, pero el contrato del backend acepta cualquier subset.
  fieldIndexes: number[]
}

/**
 * Respuesta real de `POST /sso-admin/audit/revert` (`AuditRevertResponse`).
 * `applied=false` es lo que devuelve un dry-run — acá siempre se ejecuta de
 * verdad, así que un `false` significaría que no se escribió nada.
 */
interface RealAuditRevertResponse {
  applied: boolean
  tabla: string
  pkColumn: string
  pkValue: string
  activeBefore: boolean
  activeAfter: boolean
  originalRequestId: string | null
  originalEtiqueta: string | null
  originalAppUser: string | null
  message: string
}

async function revertOperationChange({
  tableSlug,
  operationId,
  fieldIndexes,
}: RevertOperationChangeVariables): Promise<RevertOperationChangeResponse> {
  if (env.ENABLE_API_MOCKING) {
    const body: RevertOperationChangeInput = {
      tableSlug,
      operationId,
      changes: fieldIndexes.map((fieldIndex) => ({ fieldIndex })),
    }
    return api.post(
      `/audit-tables/${tableSlug}/operations/${operationId}/changes/revert`,
      body,
    )
  }

  // El revert real NO vive en la instancia de auditoría (ClickHouse es de
  // solo lectura por diseño): es `AuditRevertController` en sso-admin, que
  // escribe contra Postgres. Identifica el cambio por `(lsn, seq)` — el
  // mismo par que compone el `operationId` de ClickHouse — y hoy es FASE 1:
  // solo revierte el patrón soft-delete/soft-restore (toggle de `active`).
  // No acepta elegir qué campos revertir, así que `fieldIndexes` no viaja;
  // si la operación no es un UPDATE sobre `active`, el backend responde con
  // un error explicando por qué (409/400), que el interceptor ya tostea.
  const [lsn, seq] = operationId.split("-")
  const response = await api.post<RealAuditRevertResponse>("/sso-admin/audit/revert", {
    lsn: Number(lsn),
    seq: Number(seq),
    dryRun: false,
  })

  return {
    status: response.applied ? "ok" : "error",
    message: response.message,
    // El backend revierte exactamente un campo (`active`) cuando aplica.
    revertedFields: response.applied ? 1 : 0,
  }
}

interface UseRevertOperationChangeOptions {
  mutationConfig?: MutationConfig<typeof revertOperationChange>
}

export function useRevertOperationChange({ mutationConfig }: UseRevertOperationChangeOptions = {}) {
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

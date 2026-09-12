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
  // mismo par que compone el `operationId` que arma ClickHouse
  // (`concat(toString(lsn), '-', toString(seq))`, ver V85 §1.3 y V90 §2.4).
  // Hoy cubre INSERT (revertido como soft-delete) y UPDATE genérico; el
  // DELETE físico lo rechaza. `fieldIndexes` no viaja: el backend decide qué
  // columnas restaura, no el caller.
  const [lsnRaw, seqRaw] = operationId.split("-")
  const lsn = Number(lsnRaw)
  const seq = Number(seqRaw)

  // Sin esta guarda, un id con otro formato mandaba `NaN` — que
  // `JSON.stringify` convierte en `null` — y el backend contestaba con un
  // error de validación sobre un campo nulo, que no le dice nada a nadie. El
  // problema es acá, así que el mensaje se escribe acá.
  if (!Number.isInteger(lsn) || !Number.isInteger(seq)) {
    throw new Error(
      `No se puede revertir esta operación: su identificador ("${operationId}") no tiene el formato "lsn-seq" que espera el servidor.`,
    )
  }

  const response = await api.post<RealAuditRevertResponse>("/sso-admin/audit/revert", {
    lsn,
    seq,
    dryRun: false,
  })

  return {
    status: response.applied ? "ok" : "error",
    message: response.message,
    // El backend no dice cuántas columnas tocó: `applied` es un sí/no sobre
    // la fila entera.
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
    ...mutationConfig,
    // Refresca el detalle de cambios después de revertir para que la UI
    // muestre los campos como "ya revertidos" (before === after). Va DESPUÉS
    // del spread de `mutationConfig`: si quedara antes, `...mutationConfig`
    // pisaría este `onSuccess` entero (el `onSuccess` del caller reemplaza,
    // no se fusiona) y el `invalidateQueries` nunca correría.
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
  })
}

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

import { restaurarMock } from "@/features/bitacora/api/mock-bitacora"
import { bitacoraKeys } from "@/features/bitacora/api/query-keys"

interface RestaurarVariables {
  id: string
  motivo: string
  establecimiento: string
  /** Valida todo sin escribir: alimenta las comprobaciones del modal. */
  vistaPrevia?: boolean
}

/** `AuditRevertResponse` de sso-admin; `applied=false` en la vista previa. */
interface RestaurarResponse {
  applied: boolean
  message: string
}

export async function restaurarEvento({ id, motivo, establecimiento, vistaPrevia }: RestaurarVariables) {
  if (env.ENABLE_API_MOCKING) {
    await new Promise((r) => setTimeout(r, 300))
    restaurarMock(id, motivo, Boolean(vistaPrevia))
    return { applied: !vistaPrevia, message: "" }
  }
  return api.post<RestaurarResponse>(`/sso-admin/audit/bitacora/${id}/restaurar`, {
    MOTIVO: motivo,
    FK_ESTABLECIMIENTO: establecimiento || undefined,
    VISTA_PREVIA: vistaPrevia || undefined,
  })
}

export function useRestaurarEvento({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof restaurarEvento> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: restaurarEvento,
    ...rest,
    onSuccess: (...args) => {
      // Crea un evento Restauración y cambia la vigencia del original.
      queryClient.invalidateQueries({ queryKey: bitacoraKeys.all })
      onSuccess?.(...args)
    },
  })
}

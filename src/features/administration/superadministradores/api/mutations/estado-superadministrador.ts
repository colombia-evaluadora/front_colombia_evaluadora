import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { superadministradorKeys } from "@/features/administration/superadministradores/api/query-keys"
import type {
  Resultado,
  Superadministrador,
} from "@/features/administration/superadministradores/api/types/superadministrador"

// Inactivo pierde el acceso y se cierran sus sesiones. 400 si es uno mismo;
// 409 si es el único Superadministrador activo (Regla 9).
async function setEstadoSuperadministrador({ id, activo }: { id: number; activo: boolean }) {
  const row = await evalCol.putRow<Resultado<Superadministrador>>(
    `/superadministradores/${id}/estado`,
    { ACTIVO: activo },
  )
  return row.resultado
}

export function useEstadoSuperadministrador({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof setEstadoSuperadministrador> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: setEstadoSuperadministrador,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: superadministradorKeys.lista })
      onSuccess?.(...args)
    },
  })
}

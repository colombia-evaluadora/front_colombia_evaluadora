import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { invalidarAreasOficiales } from "@/features/administration/areas-oficiales/api/mutations/invalidar-areas-oficiales"
import type {
  AreaOficial,
  Resultado,
} from "@/features/administration/areas-oficiales/api/types/area-oficial"

// Se puede inactivar aunque esté en uso: deja de ofrecerse para asociaciones
// nuevas y lo ya asociado la conserva.
async function setEstadoAreaOficial({ id, habilitada }: { id: number; habilitada: boolean }) {
  const row = await evalCol.putRow<Resultado<AreaOficial>>(`/areas-oficiales/${id}/estado`, {
    HABILITADA: habilitada,
  })
  return row.resultado
}

export function useEstadoAreaOficial({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof setEstadoAreaOficial> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: setEstadoAreaOficial,
    ...rest,
    onSuccess: (...args) => {
      invalidarAreasOficiales(queryClient)
      onSuccess?.(...args)
    },
  })
}

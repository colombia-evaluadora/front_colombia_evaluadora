import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { criterioPrioridadKeys } from "@/features/administration/criterios-prioridad/api/query-keys"
import type {
  CriterioPrioridad,
  Resultado,
} from "@/features/administration/criterios-prioridad/api/types/criterio-prioridad"

// También en uso: desactivado deja de ofrecerse para configuraciones de admisión
// nuevas; los períodos que ya lo usan no cambian. Activar revalida campo y regla.
async function setEstadoCriterio({ id, habilitado }: { id: number; habilitado: boolean }) {
  const row = await evalCol.putRow<Resultado<CriterioPrioridad>>(
    `/criterios-prioridad/${id}/estado`,
    {
      HABILITADO: habilitado,
    },
  )
  return row.resultado
}

export function useEstadoCriterioPrioridad({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof setEstadoCriterio> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: setEstadoCriterio,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: criterioPrioridadKeys.lista })
      onSuccess?.(...args)
    },
  })
}

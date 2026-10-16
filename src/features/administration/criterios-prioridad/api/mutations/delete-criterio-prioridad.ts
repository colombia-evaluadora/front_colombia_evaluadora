import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { criterioPrioridadKeys } from "@/features/administration/criterios-prioridad/api/query-keys"

// Baja lógica; 409 (23503) si está en uso (la pantalla ya esconde la acción).
function deleteCriterio({ id }: { id: number }) {
  return evalCol.put(`/criterios-prioridad/${id}/eliminar`)
}

export function useDeleteCriterioPrioridad({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof deleteCriterio> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: deleteCriterio,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: criterioPrioridadKeys.lista })
      onSuccess?.(...args)
    },
  })
}

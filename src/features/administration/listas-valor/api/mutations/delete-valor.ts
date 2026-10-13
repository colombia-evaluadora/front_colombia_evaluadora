import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { listaValorKeys } from "@/features/administration/listas-valor/api/query-keys"

// Baja lógica; 409 si el valor está en uso o tiene hijos activos.
function deleteValor({ id }: { id: number }) {
  return evalCol.put(`/listas-valor/${id}/eliminar`)
}

export function useDeleteValor({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof deleteValor> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: deleteValor,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: listaValorKeys.all })
      onSuccess?.(...args)
    },
  })
}

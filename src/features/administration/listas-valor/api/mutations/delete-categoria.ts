import { useMutation, useQueryClient } from "@tanstack/react-query"
import { invalidateListaValor } from "@/features/establishment/academic-period/api/query/fetch-select-category"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { listaValorKeys } from "@/features/administration/listas-valor/api/query-keys"

// Baja lógica de todos sus valores; 409 si alguno está en uso o tiene hijos activos.
function deleteCategoria({ categoria }: { categoria: string }) {
  return evalCol.put(`/listas-valor/categorias/${encodeURIComponent(categoria)}/eliminar`)
}

export function useDeleteCategoria({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof deleteCategoria> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: deleteCategoria,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: listaValorKeys.all })
      invalidateListaValor(queryClient)
      onSuccess?.(...args)
    },
  })
}

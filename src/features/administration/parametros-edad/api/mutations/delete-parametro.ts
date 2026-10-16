import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { parametrosEdadKeys } from "@/features/administration/parametros-edad/api/query-keys"

export interface DeleteParametroVariables {
  tipo: "grado" | "calendario"
  /** pk del valor de la lista GRADOS o CALENDARIO. */
  codigo: string
}

// Baja física: el grado o calendario queda sin parámetro y su situación, Sin calcular.
async function deleteParametro({ tipo, codigo }: DeleteParametroVariables) {
  const recurso = tipo === "grado" ? "grados" : "calendarios"
  return evalCol.putRow(`/parametros-edad/${recurso}/${encodeURIComponent(codigo)}/eliminar`)
}

export function useDeleteParametro({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof deleteParametro> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: deleteParametro,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: parametrosEdadKeys.all })
      onSuccess?.(...args)
    },
  })
}

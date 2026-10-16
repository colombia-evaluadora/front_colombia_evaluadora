import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { listaValorKeys } from "@/features/administration/listas-valor/api/query-keys"
import type {
  Categoria,
  Resultado,
} from "@/features/administration/listas-valor/api/types/lista-valor"

// Una lista inactiva no ofrece valores en los selectores; 409 si una lista hija activa depende de ella.
async function setEstadoCategoria({
  categoria,
  habilitada,
}: {
  categoria: string
  habilitada: boolean
}) {
  const row = await evalCol.putRow<Resultado<Categoria>>(
    `/listas-valor/categorias/${encodeURIComponent(categoria)}/estado`,
    { HABILITADA: habilitada },
  )
  return row.resultado
}

export function useEstadoCategoria({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof setEstadoCategoria> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: setEstadoCategoria,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: listaValorKeys.all })
      onSuccess?.(...args)
    },
  })
}

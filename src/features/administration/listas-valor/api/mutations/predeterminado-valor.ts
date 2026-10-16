import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { listaValorKeys } from "@/features/administration/listas-valor/api/query-keys"
import type {
  ListaValor,
  Resultado,
} from "@/features/administration/listas-valor/api/types/lista-valor"

// Un solo predeterminado por lista: marcar uno desmarca el anterior (en el back).
async function setPredeterminado({ id, predeterminado }: { id: number; predeterminado: boolean }) {
  const row = await evalCol.putRow<Resultado<ListaValor>>(`/listas-valor/${id}/predeterminado`, {
    PREDETERMINADO: predeterminado,
  })
  return row.resultado
}

export function usePredeterminadoValor({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof setPredeterminado> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: setPredeterminado,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: listaValorKeys.all })
      onSuccess?.(...args)
    },
  })
}

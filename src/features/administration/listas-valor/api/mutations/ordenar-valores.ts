import { useMutation, useQueryClient } from "@tanstack/react-query"
import { invalidateListaValor } from "@/features/establishment/academic-period/api/query/fetch-select-category"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { listaValorKeys } from "@/features/administration/listas-valor/api/query-keys"
import type {
  ListaValor,
  Resultado,
} from "@/features/administration/listas-valor/api/types/lista-valor"

// `ORDEN` lleva TODOS los pk de la lista en el orden nuevo, como string JSON (400 si falta alguno).
async function ordenarValores({ categoria, orden }: { categoria: string; orden: number[] }) {
  const row = await evalCol.putRow<Resultado<ListaValor[]>>(
    `/listas-valor/categorias/${encodeURIComponent(categoria)}/orden`,
    { ORDEN: JSON.stringify(orden) },
  )
  return row.resultado
}

export function useOrdenarValores({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof ordenarValores> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: ordenarValores,
    ...rest,
    onSuccess: (...args) => {
      const [valores, { categoria }] = args
      queryClient.setQueryData(listaValorKeys.valores(categoria), valores)
      queryClient.invalidateQueries({ queryKey: listaValorKeys.all })
      invalidateListaValor(queryClient)
      onSuccess?.(...args)
    },
  })
}

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { listaValorKeys } from "@/features/administration/listas-valor/api/query-keys"
import type {
  ListaValor,
  Resultado,
  ValorDraft,
} from "@/features/administration/listas-valor/api/types/lista-valor"

// `VALORES` viaja como string JSON: así lo liga el ParamBinder (colección Postman, paso 2).
async function createCategoria({ categoria, valores }: { categoria: string; valores: ValorDraft[] }) {
  const row = await evalCol.postRow<Resultado<{ categoria: string; valores: ListaValor[] }>>(
    "/listas-valor/categorias",
    { CATEGORIA: categoria, VALORES: JSON.stringify(valores) },
  )
  return row.resultado
}

export function useCreateCategoria({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof createCategoria> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: createCategoria,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: listaValorKeys.all })
      onSuccess?.(...args)
    },
  })
}

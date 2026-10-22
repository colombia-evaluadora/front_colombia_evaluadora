import { useMutation, useQueryClient } from "@tanstack/react-query"
import { invalidateListaValor } from "@/features/establishment/academic-period/api/query/fetch-select-category"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { listaValorKeys } from "@/features/administration/listas-valor/api/query-keys"
import type {
  Categoria,
  ListaValor,
  Resultado,
  ValorDraft,
} from "@/features/administration/listas-valor/api/types/lista-valor"

interface CreateCategoriaVariables {
  categoria: string
  /** null = el back lo deriva del código. */
  nombre: string | null
  descripcion: string | null
  /** Código de la lista padre: cada valor debe llevar un `padre` de esa lista. */
  padre: string | null
  ordinal: boolean
  valores: ValorDraft[]
}

// `VALORES` viaja como string JSON: así lo liga el ParamBinder (colección Postman, paso 2).
async function createCategoria({
  categoria,
  nombre,
  descripcion,
  padre,
  ordinal,
  valores,
}: CreateCategoriaVariables) {
  const row = await evalCol.postRow<Resultado<Categoria & { valores: ListaValor[] }>>(
    "/listas-valor/categorias",
    {
      CATEGORIA: categoria,
      NOMBRE: nombre,
      DESCRIPCION: descripcion,
      PADRE: padre,
      ORDINAL: ordinal,
      VALORES: JSON.stringify(valores),
    },
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
      invalidateListaValor(queryClient)
      onSuccess?.(...args)
    },
  })
}

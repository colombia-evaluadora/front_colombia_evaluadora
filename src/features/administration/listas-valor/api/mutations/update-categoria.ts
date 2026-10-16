import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { listaValorKeys } from "@/features/administration/listas-valor/api/query-keys"
import type {
  Categoria,
  Resultado,
} from "@/features/administration/listas-valor/api/types/lista-valor"

interface UpdateCategoriaVariables {
  categoria: string
  nombre: string
  descripcion: string | null
  padre: string | null
  ordinal: boolean
}

// El código no se edita. DESCRIPCION y PADRE se reemplazan (null = quitar), así que siempre van.
async function updateCategoria({
  categoria,
  nombre,
  descripcion,
  padre,
  ordinal,
}: UpdateCategoriaVariables) {
  const row = await evalCol.putRow<Resultado<Categoria>>(
    `/listas-valor/categorias/${encodeURIComponent(categoria)}`,
    { NOMBRE: nombre, DESCRIPCION: descripcion, PADRE: padre, ORDINAL: ordinal },
  )
  return row.resultado
}

export function useUpdateCategoria({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof updateCategoria> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: updateCategoria,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: listaValorKeys.all })
      onSuccess?.(...args)
    },
  })
}

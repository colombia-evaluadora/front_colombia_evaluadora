import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { listaValorKeys } from "@/features/administration/listas-valor/api/query-keys"
import type {
  ListaValor,
  Resultado,
} from "@/features/administration/listas-valor/api/types/lista-valor"

interface SaveValorVariables {
  /** Presente = edición. */
  id?: number
  categoria: string
  nombre: string
  valor: string
  accion: string | null
  padre: number | null
}

// El PUT reemplaza todo: ACCION y PADRE siempre van (null = quitar). CATEGORIA y VALOR no se editan.
async function saveValor({ id, categoria, nombre, valor, accion, padre }: SaveValorVariables) {
  const row =
    id == null
      ? await evalCol.postRow<Resultado<ListaValor>>("/listas-valor", {
          CATEGORIA: categoria,
          NOMBRE: nombre,
          VALOR: valor,
          ACCION: accion,
          PADRE: padre,
        })
      : await evalCol.putRow<Resultado<ListaValor>>(`/listas-valor/${id}`, {
          NOMBRE: nombre,
          ACCION: accion,
          PADRE: padre,
        })
  return row.resultado
}

export function useSaveValor({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof saveValor> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: saveValor,
    ...rest,
    onSuccess: (...args) => {
      // Todo el feature: cambia el conteo y, con el padre, la dependencia de la categoría.
      queryClient.invalidateQueries({ queryKey: listaValorKeys.all })
      onSuccess?.(...args)
    },
  })
}

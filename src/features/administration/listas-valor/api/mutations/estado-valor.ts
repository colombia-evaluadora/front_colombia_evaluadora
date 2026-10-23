import { useMutation, useQueryClient } from "@tanstack/react-query"
import { invalidateListaValor } from "@/features/establishment/academic-period/api/query/fetch-select-category"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { listaValorKeys } from "@/features/administration/listas-valor/api/query-keys"
import type {
  ListaValor,
  Resultado,
} from "@/features/administration/listas-valor/api/types/lista-valor"

// Inactivo = deja de salir en los selectores y de ser predeterminado; sigue en los registros
// que ya lo tienen. 409 si tiene hijos activos; los valores del sistema no se inactivan.
async function setEstadoValor({ id, habilitado }: { id: number; habilitado: boolean }) {
  const row = await evalCol.putRow<Resultado<ListaValor>>(`/listas-valor/${id}/estado`, {
    HABILITADO: habilitado,
  })
  return row.resultado
}

export function useEstadoValor({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof setEstadoValor> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: setEstadoValor,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: listaValorKeys.all })
      invalidateListaValor(queryClient)
      onSuccess?.(...args)
    },
  })
}

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { parametrosEdadKeys } from "@/features/administration/parametros-edad/api/query-keys"

export type SaveParametroVariables =
  | { tipo: "grado"; codigo: string; edad: number }
  | { tipo: "calendario"; codigo: string; mes: number; dia: number }

// Un registro por grado o calendario: el PUT crea o reemplaza por pk de la lista.
async function saveParametro(v: SaveParametroVariables) {
  if (v.tipo === "grado") {
    return evalCol.putRow(`/parametros-edad/grados/${encodeURIComponent(v.codigo)}`, {
      EDAD: v.edad,
    })
  }
  return evalCol.putRow(`/parametros-edad/calendarios/${encodeURIComponent(v.codigo)}`, {
    MES: v.mes,
    DIA: v.dia,
  })
}

export function useSaveParametro({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof saveParametro> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: saveParametro,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: parametrosEdadKeys.all })
      onSuccess?.(...args)
    },
  })
}

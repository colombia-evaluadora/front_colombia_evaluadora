import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { parametrosEdadKeys } from "@/features/administration/parametros-edad/api/query-keys"
import type { Cortes, CortesGrado } from "@/features/administration/parametros-edad/api/types"

/** `nuevo`: es un alta; el back responde 409 si el grado o calendario ya tenía valor. */
export type SaveParametroVariables =
  | ({ tipo: "grado"; codigo: string; edad: number; nuevo: boolean } & CortesGrado)
  | { tipo: "calendario"; codigo: string; mes: number; dia: number; nuevo: boolean }
  | ({ tipo: "cortes" } & Cortes)

// Un registro por grado o calendario: el PUT crea o reemplaza por pk de la lista.
// Los cortes por defecto son un solo registro: solo se modifican.
async function saveParametro(v: SaveParametroVariables) {
  if (v.tipo === "grado") {
    return evalCol.putRow(`/parametros-edad/grados/${encodeURIComponent(v.codigo)}`, {
      EDAD: v.edad,
      BAJA_EDAD_HASTA: v.bajaEdadHasta,
      PREEXTRAEDAD_DESDE: v.preextraedadDesde,
      EXTRAEDAD_DESDE: v.extraedadDesde,
      NUEVO: v.nuevo,
    })
  }
  if (v.tipo === "cortes") {
    return evalCol.putRow("/parametros-edad/cortes", {
      BAJA_EDAD_HASTA: v.bajaEdadHasta,
      PREEXTRAEDAD_DESDE: v.preextraedadDesde,
      EXTRAEDAD_DESDE: v.extraedadDesde,
    })
  }
  return evalCol.putRow(`/parametros-edad/calendarios/${encodeURIComponent(v.codigo)}`, {
    MES: v.mes,
    DIA: v.dia,
    NUEVO: v.nuevo,
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

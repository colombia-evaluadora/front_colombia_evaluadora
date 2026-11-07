import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { relacionesAlumnoGrupoKeys } from "@/features/administration/relaciones-alumno-grupo/api/query-keys"

/** `pkRelacion` null = alta. 409 si ya hay máximo para ese nivel y zona. */
export interface SaveRelacionVariables {
  pkRelacion: number | null
  pkNivel: number
  pkZona: number
  maximo: number
}

function saveRelacion(v: SaveRelacionVariables) {
  const body = { NIVEL: v.pkNivel, ZONA: v.pkZona, MAXIMO: v.maximo }
  return v.pkRelacion == null
    ? evalCol.postRow("/relaciones-alumno-grupo", body)
    : evalCol.putRow(`/relaciones-alumno-grupo/${v.pkRelacion}`, body)
}

export function useSaveRelacion({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof saveRelacion> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: saveRelacion,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: relacionesAlumnoGrupoKeys.all })
      onSuccess?.(...args)
    },
  })
}

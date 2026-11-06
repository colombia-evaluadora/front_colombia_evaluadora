import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

import { relacionesAlumnoGrupoKeys } from "@/features/administration/relaciones-alumno-grupo/api/query-keys"

// Solo quita la advertencia del Cupo; los grupos guardados no cambian.
function deleteRelacion({ pkRelacion }: { pkRelacion: number }) {
  return api.delete(`/eval-col/relaciones-alumno-grupo/${pkRelacion}`)
}

export function useDeleteRelacion({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof deleteRelacion> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: deleteRelacion,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: relacionesAlumnoGrupoKeys.all })
      onSuccess?.(...args)
    },
  })
}

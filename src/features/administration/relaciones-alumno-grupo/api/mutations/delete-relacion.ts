import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { relacionesAlumnoGrupoKeys } from "@/features/administration/relaciones-alumno-grupo/api/query-keys"

// Solo quita la advertencia del Cupo. PUT: query-service no admite DELETE.
function deleteRelacion({ pkRelacion }: { pkRelacion: number }) {
  return evalCol.put(`/relaciones-alumno-grupo/${pkRelacion}/eliminar`)
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

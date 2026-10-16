import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { invalidarAreasOficiales } from "@/features/administration/areas-oficiales/api/mutations/invalidar-areas-oficiales"

// Baja lógica del área y de sus asignaturas de catálogo; 409 (23503) si algún
// Plan de Estudio o Referente la usa (la pantalla ya esconde la acción).
function deleteAreaOficial({ id }: { id: number }) {
  return evalCol.put(`/areas-oficiales/${id}/eliminar`)
}

export function useDeleteAreaOficial({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof deleteAreaOficial> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: deleteAreaOficial,
    ...rest,
    onSuccess: (...args) => {
      invalidarAreasOficiales(queryClient)
      onSuccess?.(...args)
    },
  })
}

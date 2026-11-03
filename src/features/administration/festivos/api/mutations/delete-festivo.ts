import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { invalidarFestivos } from "@/features/administration/festivos/api/mutations/invalidar-festivos"

// 409 (23503) si un período que ya comenzó lo usa (la pantalla ya esconde la acción).
function deleteFestivo({ id }: { id: number }) {
  return evalCol.put(`/festivos/${id}/eliminar`)
}

export function useDeleteFestivo({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof deleteFestivo> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: deleteFestivo,
    ...rest,
    onSuccess: (...args) => {
      invalidarFestivos(queryClient)
      onSuccess?.(...args)
    },
  })
}

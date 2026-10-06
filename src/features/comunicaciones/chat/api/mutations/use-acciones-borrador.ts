import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Borrador } from "@/features/comunicaciones/chat/api/types"

// Enviar un borrador crea un mensaje: se invalida todo el chat.
export function useEnviarBorrador() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => evalCol.patchRow<Borrador>(`/comunicaciones/borradores/${id}/enviar`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.all }),
  })
}

export function useEliminarBorrador() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      evalCol.patchRow<Borrador>(`/comunicaciones/borradores/${id}/eliminar`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.borradores }),
  })
}

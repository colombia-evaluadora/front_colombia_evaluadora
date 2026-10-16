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

/**
 * Guarda lo que quedó escrito en el editor de un canal (un borrador por canal y
 * persona; texto vacío lo descarta). Se dispara al salir del canal, sin aviso:
 * un fallo solo significa que no quedó el borrador.
 */
export function useGuardarBorrador() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ conversacionId, texto }: { conversacionId: number; texto: string }) =>
      evalCol.put(`/comunicaciones/conversaciones/${conversacionId}/borrador`, {
        TEXTO: texto,
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: chatKeys.borradores }),
  })
}

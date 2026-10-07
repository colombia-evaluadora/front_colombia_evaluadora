import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { ArchivoCompartido } from "@/features/comunicaciones/chat/api/types"

export function useGuardarDocumento() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ archivoId, html }: { archivoId: number; html: string }) =>
      evalCol.putRow<ArchivoCompartido>(`/comunicaciones/archivos/${archivoId}/contenido`, {
        CONTENIDO_HTML: html,
      }),
    onSuccess: (_, { archivoId }) => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.archivos })
      void queryClient.invalidateQueries({ queryKey: chatKeys.documento(archivoId) })
    },
  })
}

// Baja lógica: el mensaje donde se compartió queda con el aviso "Archivo eliminado".
export function useEliminarArchivo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (archivoId: number) =>
      evalCol.patchRow<ArchivoCompartido>(`/comunicaciones/archivos/${archivoId}/eliminar`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.all }),
  })
}

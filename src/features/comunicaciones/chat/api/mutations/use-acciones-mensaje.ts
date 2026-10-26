import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import { comoEliminado } from "@/features/comunicaciones/chat/lib/estado-mensaje"

const base = (id: number) => `/comunicaciones/mensajes/${id}`

// Reemplaza el mensaje en la caché de su conversación con lo que devolvió el back.
function useActualizarEnCache() {
  const queryClient = useQueryClient()
  return (m: Mensaje) =>
    queryClient.setQueryData<Mensaje[]>(chatKeys.mensajes(m.conversacionId), (prev) =>
      prev?.map((x) => (x.id === m.id ? m : x)),
    )
}

export function useEditarMensaje() {
  const actualizar = useActualizarEnCache()
  return useMutation({
    mutationFn: ({ id, texto }: { id: number; texto: string }) =>
      evalCol.patchRow<Mensaje>(base(id), { TEXTO: texto }),
    onSuccess: actualizar,
  })
}

export function useFijarMensaje() {
  const actualizar = useActualizarEnCache()
  return useMutation({
    mutationFn: ({ id, fijado }: { id: number; fijado: boolean }) =>
      evalCol.patchRow<Mensaje>(`${base(id)}/fijar`, { FIJADO: fijado ? "S" : "N" }),
    onSuccess: actualizar,
  })
}

// Pone o quita la reacción del usuario con ese emoji.
export function useReaccionarMensaje() {
  const actualizar = useActualizarEnCache()
  return useMutation({
    mutationFn: ({ id, emoji }: { id: number; emoji: string }) =>
      evalCol.postRow<Mensaje>(`${base(id)}/reacciones`, { EMOJI: emoji }),
    onSuccess: actualizar,
  })
}

/**
 * Quita un archivo del mensaje para todos (queda el aviso "Archivo eliminado"). Con
 * `adjuntoId` quita ese; sin él (adjuntos anteriores a `tmensaje_adjunto`) quita el del mensaje.
 * comms-service responde 409 si otra persona ya lo descargó.
 */
export function useEliminarAdjunto() {
  const queryClient = useQueryClient()
  const actualizar = useActualizarEnCache()
  return useMutation({
    mutationFn: ({ mensajeId, adjuntoId }: { mensajeId: number; adjuntoId?: number | null }) =>
      evalCol.patchRow<Mensaje>(
        adjuntoId != null ? `${base(mensajeId)}/adjuntos/${adjuntoId}/eliminar` : `${base(mensajeId)}/adjunto/eliminar`,
      ),
    onSuccess: (m) => {
      actualizar(m)
      queryClient.invalidateQueries({ queryKey: chatKeys.archivos })
    },
  })
}

export function useEliminarMensaje() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => evalCol.patchRow<Mensaje>(`${base(id)}/eliminar`),
    // Borrado lógico: comms-service devuelve el mensaje con `eliminado` (y el original solo a
    // quien modera); queda en su lugar como aviso "Este mensaje fue eliminado".
    onSuccess: (m) => {
      queryClient.setQueryData<Mensaje[]>(chatKeys.mensajes(m.conversacionId), (prev) =>
        prev?.map((x) => (x.id === m.id ? (m.eliminado ? m : comoEliminado(x, null)) : x)),
      )
      queryClient.invalidateQueries({ queryKey: chatKeys.archivos })
    },
  })
}

/**
 * Registra que el usuario descargó un archivo de un mensaje ajeno. Con la primera descarga
 * de otra persona el autor ya no puede quitarlo (llega por `mensaje.actualizado`). Sin
 * `adjuntoId` (adjuntos anteriores a `tmensaje_adjunto`) no hay qué registrar.
 */
export function useRegistrarDescarga() {
  const actualizar = useActualizarEnCache()
  return useMutation({
    mutationFn: ({ mensajeId, adjuntoId }: { mensajeId: number; adjuntoId: number }) =>
      evalCol.postRow<Mensaje>(`${base(mensajeId)}/adjuntos/${adjuntoId}/descargas`),
    onSuccess: actualizar,
  })
}

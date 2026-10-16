import { useQueryClient, type QueryClient } from "@tanstack/react-query"

import { useRealtimeTopic } from "@/lib/realtime/use-realtime"
import type { RealtimeEvent } from "@/lib/realtime/protocol"
import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import { topicCanal, upsertMensaje } from "@/features/comunicaciones/chat/api/use-chat-tiempo-real"
import { forosKeys } from "@/features/comunicaciones/foros/api/query-keys"
import type { Publicacion } from "@/features/comunicaciones/foros/api/types"
import {
  actualizarMensajeEnCache,
  actualizarPublicacionEnCache,
  quitarPublicacionDeCache,
} from "@/features/comunicaciones/foros/api/mutations/use-acciones-foro"

/**
 * Eventos en vivo de un foro (D-1.6: solo parchean o invalidan la cache).
 *
 * - `foro:<id>` (comms-service `ForoService`): `publicacion.creada|actualizada|eliminada`,
 *   `respuesta.creada|actualizada|eliminada` (`{ publicacionId, mensaje }`) y
 *   `foro.actualizado` (etiquetas).
 * - `canal:<id>`: reacciones y ediciones que pasan por los endpoints del chat
 *   (`mensaje.actualizado|eliminado`).
 */
export const topicForo = (foroId: number) => `foro:${foroId}`

interface RespuestaEvento {
  publicacionId: number
  mensaje: Mensaje
}

export function aplicarEventoForo(queryClient: QueryClient, foroId: number, e: RealtimeEvent) {
  switch (e.event) {
    case "publicacion.creada":
      void queryClient.invalidateQueries({ queryKey: forosKeys.publicacionesDe(foroId) })
      return
    case "publicacion.actualizada":
      actualizarPublicacionEnCache(queryClient, e.data as Publicacion, "socket")
      return
    case "publicacion.eliminada": {
      const { id } = e.data as { id: number }
      quitarPublicacionDeCache(queryClient, id, foroId)
      return
    }
    case "respuesta.creada": {
      const { publicacionId, mensaje } = e.data as RespuestaEvento
      queryClient.setQueryData<Mensaje[]>(forosKeys.respuestas(publicacionId), (prev) => upsertMensaje(prev, mensaje))
      return
    }
    case "respuesta.actualizada":
      actualizarMensajeEnCache(queryClient, (e.data as RespuestaEvento).mensaje)
      return
    case "respuesta.eliminada": {
      const { id, publicacionId } = e.data as { id: number; publicacionId: number }
      queryClient.setQueryData<Mensaje[]>(forosKeys.respuestas(publicacionId), (prev) => prev?.filter((x) => x.id !== id))
      return
    }
    case "foro.actualizado":
      void queryClient.invalidateQueries({ queryKey: forosKeys.cabecera(foroId) })
      return
  }
}

export function aplicarEventoCanalForo(queryClient: QueryClient, e: RealtimeEvent) {
  if (e.event === "mensaje.actualizado") actualizarMensajeEnCache(queryClient, e.data as Mensaje)
  if (e.event === "mensaje.eliminado") {
    const { id } = e.data as { id: number }
    queryClient.setQueriesData<Mensaje[]>(
      { queryKey: forosKeys.all, predicate: (q) => q.queryKey.at(-1) === "respuestas" },
      (prev) => prev?.filter((x) => x.id !== id),
    )
  }
}

export function useForoTiempoReal(foroId: number | undefined) {
  const queryClient = useQueryClient()
  const resync = () => void queryClient.invalidateQueries({ queryKey: forosKeys.all })
  useRealtimeTopic(foroId ? topicForo(foroId) : null, (e) => aplicarEventoForo(queryClient, foroId as number, e), resync)
  useRealtimeTopic(foroId ? topicCanal(foroId) : null, (e) => aplicarEventoCanalForo(queryClient, e), resync)
}

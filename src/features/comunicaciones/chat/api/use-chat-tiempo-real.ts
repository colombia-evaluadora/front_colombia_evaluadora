import { useEffect, useRef, useState } from "react"
import { useQueryClient, type QueryClient } from "@tanstack/react-query"

import { useAuth } from "@/features/auth/hooks/use-auth"
import { realtime } from "@/lib/realtime"
import { useRealtimeTopic } from "@/lib/realtime/use-realtime"
import type { RealtimeEvent } from "@/lib/realtime/protocol"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Conversacion, Mensaje, Miembro } from "@/features/comunicaciones/chat/api/types"

/**
 * Eventos en vivo del chat (contrato de `add-tiempo-real-gateway`). Siguiendo
 * D-1.6 solo parchean o invalidan la cache de TanStack Query: las lecturas
 * siguen por REST y no hay un store paralelo.
 */

/** Cuánto dura el "escribiendo" sin una señal nueva. */
export const ESCRIBIENDO_TTL_MS = 4_000
/** Cada cuánto se reenvía la señal mientras el usuario sigue tecleando. */
export const ESCRIBIENDO_THROTTLE_MS = 2_500

export const topicCanal = (conversacionId: number) => `canal:${conversacionId}`

/** Inserta o reemplaza por id, manteniendo el orden por fecha. */
export function upsertMensaje(prev: Mensaje[] | undefined, m: Mensaje): Mensaje[] | undefined {
  if (!prev) return prev
  const i = prev.findIndex((x) => x.id === m.id)
  if (i >= 0) return prev.map((x) => (x.id === m.id ? m : x))
  return [...prev, m].sort((a, b) => a.fecha.localeCompare(b.fecha))
}

function setEnLinea(queryClient: QueryClient, usuarioId: number, enLinea: boolean) {
  queryClient.setQueriesData<Miembro[]>({ queryKey: chatKeys.all, predicate: esMiembros }, (prev) =>
    prev?.map((m) => (m.id === usuarioId ? { ...m, enLinea } : m)),
  )
  queryClient.setQueriesData<Mensaje[]>({ queryKey: chatKeys.all, predicate: esMensajes }, (prev) =>
    prev?.map((m) => (m.autor.id === usuarioId ? { ...m, autor: { ...m.autor, enLinea } } : m)),
  )
}

const esMiembros = (q: { queryKey: readonly unknown[] }) => q.queryKey.at(-1) === "miembros"
const esMensajes = (q: { queryKey: readonly unknown[] }) => q.queryKey.at(-1) === "mensajes"

/** Bandeja personal: no leídos/menciones por conversación y notificaciones. */
export function useChatTiempoRealUsuario() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  useRealtimeTopic(
    user ? `user:${user.id}` : null,
    (e) => {
      if (e.event === "conversacion.actualizada") {
        const c = e.data as Conversacion
        queryClient.setQueryData<Conversacion[]>(chatKeys.conversaciones, (prev) =>
          prev?.some((x) => x.id === c.id) ? prev.map((x) => (x.id === c.id ? c : x)) : prev,
        )
      } else if (e.event === "notificacion.creada") {
        // La campana del chat (y la de `features/notificaciones`) leen por REST.
        void queryClient.invalidateQueries({ queryKey: chatKeys.notificaciones })
      }
    },
    () => void queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones }),
  )

  useRealtimeTopic(
    "presencia",
    (e) => {
      if (e.event !== "presencia.actualizada") return
      const { usuarioId, enLinea } = e.data as { usuarioId: number; enLinea: boolean }
      setEnLinea(queryClient, usuarioId, enLinea)
    },
  )
}

interface Escribiendo {
  usuarioId: number
  nombre: string
  hasta: number
}

/**
 * Mensajes nuevos/editados/eliminados y "escribiendo" del canal abierto.
 * Devuelve quién está escribiendo ahora.
 */
export function useChatTiempoRealCanal(conversacionId: number | undefined) {
  const queryClient = useQueryClient()
  const [escribiendo, setEscribiendo] = useState<Escribiendo[]>([])
  const key = chatKeys.mensajes(conversacionId ?? "none")

  const aplicar = (e: RealtimeEvent) => {
    switch (e.event) {
      case "mensaje.creado":
      case "mensaje.actualizado": {
        const m = e.data as Mensaje
        queryClient.setQueryData<Mensaje[]>(key, (prev) => upsertMensaje(prev, m))
        // Llegó el mensaje: quien lo escribió ya no está "escribiendo".
        if (e.event === "mensaje.creado") {
          setEscribiendo((prev) => prev.filter((x) => x.usuarioId !== m.autor.id))
        }
        return
      }
      case "mensaje.eliminado": {
        const { id } = e.data as { id: number }
        queryClient.setQueryData<Mensaje[]>(key, (prev) => prev?.filter((x) => x.id !== id))
        void queryClient.invalidateQueries({ queryKey: chatKeys.archivos })
        return
      }
      case "escribiendo": {
        const { usuarioId, nombre } = e.data as { usuarioId: number; nombre: string }
        const hasta = Date.now() + ESCRIBIENDO_TTL_MS
        setEscribiendo((prev) => [...prev.filter((x) => x.usuarioId !== usuarioId), { usuarioId, nombre, hasta }])
        return
      }
    }
  }

  useRealtimeTopic(
    conversacionId ? topicCanal(conversacionId) : null,
    aplicar,
    () => void queryClient.invalidateQueries({ queryKey: key }),
  )

  // Limpia los "escribiendo" vencidos y al cambiar de canal.
  useEffect(() => {
    setEscribiendo([])
  }, [conversacionId])
  const hayEscribiendo = escribiendo.length > 0
  useEffect(() => {
    if (!hayEscribiendo) return
    const t = setInterval(() => {
      const ahora = Date.now()
      setEscribiendo((prev) => {
        const vigentes = prev.filter((x) => x.hasta > ahora)
        return vigentes.length === prev.length ? prev : vigentes
      })
    }, 1_000)
    return () => clearInterval(t)
  }, [hayEscribiendo])

  return escribiendo.map((x) => x.nombre)
}

/** Señal efímera "estoy escribiendo", con throttle. No-op sin tiempo real. */
export function useAvisarEscribiendo(conversacionId: number | undefined) {
  const ultimo = useRef(0)
  return () => {
    if (!realtime || !conversacionId) return
    const ahora = Date.now()
    if (ahora - ultimo.current < ESCRIBIENDO_THROTTLE_MS) return
    ultimo.current = ahora
    realtime.sendEphemeral(topicCanal(conversacionId), "escribiendo")
  }
}

/** "Ana está escribiendo…", "Ana y Luis están escribiendo…", "Varias personas…". */
export function textoEscribiendo(nombres: string[]): string {
  const primeros = nombres.map((n) => n.split(" ")[0])
  if (primeros.length === 0) return ""
  if (primeros.length === 1) return `${primeros[0]} está escribiendo…`
  if (primeros.length === 2) return `${primeros[0]} y ${primeros[1]} están escribiendo…`
  return "Varias personas están escribiendo…"
}

import { useEffect, useRef, useState } from "react"
import { useQueryClient, type QueryClient } from "@tanstack/react-query"

import { useAuth } from "@/features/auth/hooks/use-auth"
import { topicoUsuario } from "@/lib/auth-mapper"
import { realtime } from "@/lib/realtime"
import { useRealtimeTopic } from "@/lib/realtime/use-realtime"
import type { RealtimeEvent } from "@/lib/realtime/protocol"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import { SALIR_MUTATION_KEY } from "@/features/comunicaciones/chat/api/mutations/use-acciones-conversacion"
import type { Conversacion, Mensaje, Miembro } from "@/features/comunicaciones/chat/api/types"
import { comoEliminado } from "@/features/comunicaciones/chat/lib/estado-mensaje"

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
/**
 * El evento en vivo llega en forma neutra (`miVoto: null`, igual para todos). Un
 * voto no se retira, así que se conserva el propio mientras sea la misma
 * votación; editarla cambia `cierraEn` y reinicia los votos.
 */
function conMiVoto(prev: Mensaje, m: Mensaje): Mensaje {
  const antes = prev.votacion
  const ahora = m.votacion
  if (!antes || !ahora || ahora.miVoto != null || antes.miVoto == null) return m
  if (antes.cierraEn !== ahora.cierraEn) return m
  return { ...m, votacion: { ...ahora, miVoto: antes.miVoto } }
}

export function upsertMensaje(prev: Mensaje[] | undefined, m: Mensaje): Mensaje[] | undefined {
  if (!prev) return prev
  const i = prev.findIndex((x) => x.id === m.id)
  if (i >= 0) return prev.map((x) => (x.id === m.id ? conMiVoto(x, m) : x))
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

/**
 * Bandeja personal: no leídos/menciones por conversación. Las notificaciones
 * (`notification.*` en el mismo tópico) las atiende
 * `features/notificaciones/hooks/use-notificaciones-tiempo-real.ts`.
 */
export interface ConversacionEliminada {
  id: number
  // Nombre que tenía en la lista (para el aviso); null si no estaba cargada.
  nombre: string | null
  // QUITADO: un administrador sacó al usuario; ELIMINADA: se borró la conversación.
  motivo: string | null
}

/**
 * Evento de la bandeja personal sobre la lista de conversaciones (puro, para probarlo):
 * - `conversacion.actualizada` de una conversación conocida la reemplaza; de una desconocida
 *   (lo acaban de agregar a un grupo o foro) pide la lista otra vez, así aparece en vivo.
 * - `conversacion.eliminada` la quita de la lista y devuelve lo que hace falta para avisar.
 */
export function aplicarEventoUsuario(
  queryClient: QueryClient,
  e: Pick<RealtimeEvent, "event" | "data">,
): ConversacionEliminada | null {
  if (e.event === "conversacion.actualizada") {
    const c = e.data as Conversacion
    const lista = queryClient.getQueryData<Conversacion[]>(chatKeys.conversaciones)
    if (lista && !lista.some((x) => x.id === c.id)) {
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones })
      return null
    }
    queryClient.setQueryData<Conversacion[]>(chatKeys.conversaciones, (prev) =>
      prev?.map((x) => (x.id === c.id ? c : x)),
    )
    return null
  }
  // Te invitaron a un grupo, aceptaste o rechazaste en otra sesión, o te retiraron la invitación.
  if (e.event === "invitaciones.actualizadas") {
    void queryClient.invalidateQueries({ queryKey: chatKeys.invitaciones })
    return null
  }
  if (e.event === "conversacion.eliminada") {
    const { id, motivo } = e.data as { id: number; motivo?: string }
    const nombre = queryClient.getQueryData<Conversacion[]>(chatKeys.conversaciones)?.find((x) => x.id === id)?.nombre
    queryClient.setQueryData<Conversacion[]>(chatKeys.conversaciones, (prev) => prev?.filter((x) => x.id !== id))
    queryClient.removeQueries({ queryKey: chatKeys.mensajes(id) })
    queryClient.removeQueries({ queryKey: chatKeys.miembros(id) })
    return { id, nombre: nombre ?? null, motivo: motivo ?? null }
  }
  return null
}

export function useChatTiempoRealUsuario(onEliminada?: (c: ConversacionEliminada) => void) {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  useRealtimeTopic(
    user ? topicoUsuario(user) : null,
    (e) => {
      const eliminada = aplicarEventoUsuario(queryClient, e)
      if (eliminada) onEliminada?.(eliminada)
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
export function useChatTiempoRealCanal(conversacionId: number | undefined, verEliminados = false) {
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
        // Borrado lógico: queda el aviso. Quien modera vuelve a pedir el historial para ver el
        // original (el evento no trae el texto).
        const { id, eliminadoEn } = e.data as { id: number; eliminadoEn?: string }
        queryClient.setQueryData<Mensaje[]>(key, (prev) =>
          prev?.map((x) => (x.id === id ? comoEliminado(x, eliminadoEn) : x)),
        )
        if (verEliminados) void queryClient.invalidateQueries({ queryKey: key })
        void queryClient.invalidateQueries({ queryKey: chatKeys.archivos })
        return
      }
      case "miembros.actualizados": {
        // Alta, baja, bloqueo o rol en la conversación abierta: lista de participantes y totales.
        // Si el aviso es por la salida propia (llega antes que la respuesta del PATCH), la
        // lista de miembros ya no es accesible (404): solo se refresca la de conversaciones.
        // Lo mismo si ya salió de la lista (lo quitaron: `conversacion.eliminada`).
        const lista = queryClient.getQueryData<Conversacion[]>(chatKeys.conversaciones)
        const fuera = !!lista && !lista.some((x) => x.id === conversacionId)
        const saliendo =
          queryClient.isMutating({
            mutationKey: SALIR_MUTATION_KEY,
            predicate: (m) => m.state.variables === conversacionId,
          }) > 0
        if (!saliendo && !fuera) {
          void queryClient.invalidateQueries({ queryKey: chatKeys.miembros(conversacionId ?? "none") })
        }
        void queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones })
        return
      }
      case "conversacion.lectura": {
        // Confirmación de lectura: alguien leyó; los mensajes propios pasan a doble check.
        const { conversacionId: id, leidoHasta } = e.data as { conversacionId: number; leidoHasta: number }
        queryClient.setQueryData<Conversacion[]>(chatKeys.conversaciones, (prev) =>
          prev?.map((c) => (c.id === id ? { ...c, leidoHasta: Math.max(c.leidoHasta ?? 0, leidoHasta) } : c)),
        )
        return
      }
      case "actividad.actualizada": {
        // Alguien votó, respondió o leyó una actividad (elección, encuesta,
        // comunicado, evaluación). El evento no trae conteos (la urna es secreta):
        // se vuelve a pedir el detalle por REST con los permisos de quien mira,
        // así el creador ve en vivo resultados y "Han visto N".
        const id = conversacionId ?? "none"
        for (const k of [chatKeys.eleccion(id), chatKeys.encuesta(id), chatKeys.comunicado(id), chatKeys.evaluacion(id)]) {
          void queryClient.invalidateQueries({ queryKey: k })
        }
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

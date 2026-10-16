import type { Conversacion, Mensaje } from "@/features/comunicaciones/chat/api/types"
import { textoPlano } from "@/features/comunicaciones/chat/lib/menciones"

/**
 * Adaptador chat → notificaciones (PLAN-comunicaciones §11: "mención, DM,
 * respuesta" producen notificación con enlace `/app/comunicaciones/chat?canal=&mensaje=`).
 *
 * El módulo de notificaciones (campana/bandeja y push) se construye aparte en
 * `features/notificaciones`; este archivo NO depende de él. Es el punto de
 * enganche documentado:
 *
 * 1. Cada notificación queda en `bandejaSalidaNotificacionesChat` (outbox en
 *    memoria, se puede inspeccionar desde tests o la consola).
 * 2. Se entrega a cada sink registrado con `registrarSinkNotificacionesChat`.
 *    El mock de notificaciones solo tiene que hacer, p. ej.:
 *
 *      registrarSinkNotificacionesChat((n) => notificaciones.push(aMiFormato(n)))
 *
 * 3. Los handlers del chat además publican `notificacion.creada` en el tópico
 *    `user:<sub>` del gateway simulado (lo que hará `comms-service` en real),
 *    así la campana puede escuchar en vivo sin acoplarse al chat.
 */

export type TipoNotificacionChat = "MENCION" | "DIRECTO" | "RESPUESTA"

export interface NotificacionChatSalida {
  id: number
  tipo: TipoNotificacionChat
  /** Id de persona del chat que la recibe. */
  destinatarioId: number
  titulo: string
  cuerpo: string
  /** Deep link a la conversación y al mensaje. */
  url: string
  conversacionId: number
  mensajeId: number
  autor: string
  fecha: string
}

type Sink = (n: NotificacionChatSalida) => void

export const bandejaSalidaNotificacionesChat: NotificacionChatSalida[] = []
const sinks = new Set<Sink>()
let siguienteId = 1

export function registrarSinkNotificacionesChat(sink: Sink) {
  sinks.add(sink)
  return () => {
    sinks.delete(sink)
  }
}

/** Prioridad si un mismo mensaje cumple varias reglas para una persona. */
const PRIORIDAD: Record<TipoNotificacionChat, number> = { MENCION: 3, RESPUESTA: 2, DIRECTO: 1 }

interface ContextoNotificacion {
  conversacion: Pick<Conversacion, "id" | "nombre" | "tipo">
  /** Miembros de la conversación (para `@canal` / `@todos` y DMs). */
  miembros: readonly { id: number; enLinea: boolean }[]
  /** Autor del mensaje citado, si es una respuesta. */
  autorRespuestaId?: number | null
}

/**
 * Regla pura: quién recibe qué por un mensaje nuevo. Nunca notifica al autor;
 * `@canal` solo a los conectados y `@todos` a todos (como `@here`/`@everyone`).
 * Las menciones masivas solo llegan acá si el servidor las aceptó (permiso).
 */
export function notificacionesDeMensaje(
  mensaje: Mensaje,
  { conversacion, miembros, autorRespuestaId }: ContextoNotificacion,
): Omit<NotificacionChatSalida, "id">[] {
  const porDestino = new Map<number, TipoNotificacionChat>()
  const poner = (id: number, tipo: TipoNotificacionChat) => {
    if (id === mensaje.autor.id) return
    const actual = porDestino.get(id)
    if (!actual || PRIORIDAD[tipo] > PRIORIDAD[actual]) porDestino.set(id, tipo)
  }

  if (conversacion.tipo === "DIRECTO") {
    for (const m of miembros) poner(m.id, "DIRECTO")
  }
  if (autorRespuestaId != null) poner(autorRespuestaId, "RESPUESTA")
  for (const m of mensaje.menciones ?? []) {
    if (m.tipo === "USUARIO" && m.usuarioId != null) poner(m.usuarioId, "MENCION")
    else if (m.tipo === "TODOS") for (const x of miembros) poner(x.id, "MENCION")
    else if (m.tipo === "CANAL") for (const x of miembros) if (x.enLinea) poner(x.id, "MENCION")
  }

  const destino =
    conversacion.tipo === "CANAL" ? `#${conversacion.nombre}` : "un mensaje directo"
  const cuerpo = textoPlano(mensaje.texto, mensaje.menciones).slice(0, 140) || "Envió un archivo."
  return [...porDestino].map(([destinatarioId, tipo]) => ({
    tipo,
    destinatarioId,
    titulo:
      tipo === "MENCION"
        ? `${mensaje.autor.nombre} te mencionó en ${destino}`
        : tipo === "RESPUESTA"
          ? `${mensaje.autor.nombre} respondió a tu mensaje`
          : `Mensaje directo de ${mensaje.autor.nombre}`,
    cuerpo,
    url: `/app/comunicaciones/chat?canal=${conversacion.id}&mensaje=${mensaje.id}`,
    conversacionId: conversacion.id,
    mensajeId: mensaje.id,
    autor: mensaje.autor.nombre,
    fecha: mensaje.fecha,
  }))
}

/** Guarda en el outbox y entrega a los sinks. Devuelve lo emitido. */
export function emitirNotificacionesChat(
  pendientes: Omit<NotificacionChatSalida, "id">[],
): NotificacionChatSalida[] {
  const emitidas = pendientes.map((n) => ({ ...n, id: siguienteId++ }))
  for (const n of emitidas) {
    bandejaSalidaNotificacionesChat.push(n)
    for (const sink of sinks) sink(n)
  }
  return emitidas
}

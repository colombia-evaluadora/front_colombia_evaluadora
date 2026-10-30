import type { CitaMensaje, Conversacion, Mensaje } from "@/features/comunicaciones/chat/api/types"
import { textoPlano } from "@/features/comunicaciones/chat/lib/menciones"
import {
  USUARIO_ACTUAL,
  conVistaPrevia,
  autorDe,
  conversaciones,
  miembrosDe,
  nuevoMensaje,
  personas,
} from "@/mocks/db/comunicaciones"
import {
  emitirNotificacionesChat,
  notificacionesDeMensaje,
} from "@/mocks/db/comunicaciones-notificaciones"
import { notificacionesDb } from "@/mocks/db/notificaciones"
import { onConnect, publish, publishEphemeral } from "@/mocks/realtime/server"
// Registra el sink que lleva las notificaciones del chat a la bandeja del mock.
import "@/mocks/db/comunicaciones-notificaciones-puente"

/**
 * Eventos del chat sobre el gateway simulado y una simulación mínima de "otras
 * personas" (respuestas, escribiendo, presencia) para ver el prototipo en vivo.
 *
 * Tópicos (los mismos que usaría `comms-service`):
 * - `canal:<id>`: `mensaje.creado|actualizado|eliminado` y el efímero `escribiendo`.
 * - `user:<sub>`: `conversacion.actualizada` (no leídos/menciones) y `notification.created`
 *   (la fila de la bandeja, como notification-service).
 * - `presencia`: efímero `presencia.actualizada`.
 */

/** El mock tiene un solo usuario real del chat (`USUARIO_ACTUAL`); su `sub` sale del ticket. */
let subActual = "anonimo"

export function setUsuarioChatActual(sub: string) {
  subActual = sub
}

export const topicCanal = (conversacionId: number) => `canal:${conversacionId}`

export function topicUsuario(personaId: number) {
  return personaId === USUARIO_ACTUAL.id ? `user:${subActual}` : `user:chat-${personaId}`
}

export function citaDe(m: Mensaje): CitaMensaje {
  return {
    id: m.id,
    autor: m.autor.nombre,
    texto: textoPlano(m.texto, m.menciones).slice(0, 200) || (m.adjunto ? m.adjunto.nombre : ""),
    eliminado: false,
  }
}

/** Miembros "con identidad" de la conversación, incluido el usuario actual. */
export function participantes(conv: Conversacion) {
  if (conv.tipo === "DIRECTO") {
    const otro = personas.find((p) => p.nombre === conv.nombre)
    return [
      { id: USUARIO_ACTUAL.id, nombre: USUARIO_ACTUAL.nombre, enLinea: true },
      ...(otro ? [{ id: otro.id, nombre: otro.nombre, enLinea: true }] : []),
    ]
  }
  return [
    { id: USUARIO_ACTUAL.id, nombre: USUARIO_ACTUAL.nombre, enLinea: true },
    ...miembrosDe(conv.id).filter((m) => !m.bloqueado),
  ]
}

/**
 * Forma difundida por el socket, igual para todos como en comms-service:
 * `esPropio`, `meMenciona` y `reacciones[].mia` en `false`. El cliente los
 * calcula con `autor.id`, `menciones` y `reacciones[].usuarios`
 * (`features/comunicaciones/chat/lib/personalizar-mensaje.ts`).
 */
export function mensajeNeutro(m: Mensaje): Mensaje {
  return {
    ...m,
    esPropio: false,
    meMenciona: false,
    reacciones: m.reacciones?.map((r) => ({ ...r, mia: false })),
    votacion: m.votacion && votacionNeutra(m.votacion),
  }
}

// Sin resultados en vivo: abierta no viajan conteos ni total; cerrada, el resultado final.
function votacionNeutra(v: NonNullable<Mensaje["votacion"]>): NonNullable<Mensaje["votacion"]> {
  const cerrada = new Date(v.cierraEn) <= new Date()
  return {
    ...v,
    miVoto: null,
    cerrada,
    opciones: v.opciones.map((o) => ({ ...o, votos: cerrada ? (o.votos ?? 0) : null })),
    totalVotos: cerrada ? v.opciones.reduce((n, o) => n + (o.votos ?? 0), 0) : null,
  }
}

export function publicarConversacion(conv: Conversacion) {
  publish(topicUsuario(USUARIO_ACTUAL.id), "conversacion.actualizada", conVistaPrevia(conv))
}

export function publicarMensajeCreado(m: Mensaje, autorRespuestaId?: number | null) {
  const conv = conversaciones.find((c) => c.id === m.conversacionId)
  if (!conv) return
  publish(topicCanal(conv.id), "mensaje.creado", mensajeNeutro(m))
  if (!m.esPropio) {
    conv.noLeidos += 1
    if (m.meMenciona) conv.menciones = (conv.menciones ?? 0) + 1
    publicarConversacion(conv)
  } else {
    // Como comms-service: la vista previa del último mensaje también cambia para quien escribe.
    publicarConversacion(conv)
  }
  const emitidas = emitirNotificacionesChat(
    notificacionesDeMensaje(m, { conversacion: conv, miembros: participantes(conv), autorRespuestaId }),
  )
  for (const n of emitidas) {
    // El puente ya la insertó en la bandeja del mock (solo si es del usuario actual).
    const fila = notificacionesDb.find((x) => x.id === `chat-${n.id}`)
    if (fila) publish(topicUsuario(n.destinatarioId), "notification.created", fila)
  }
}

export function publicarMensajeActualizado(m: Mensaje) {
  publish(topicCanal(m.conversacionId), "mensaje.actualizado", mensajeNeutro(m))
}

export function publicarMensajeEliminado(m: Mensaje) {
  publish(topicCanal(m.conversacionId), "mensaje.eliminado", {
    id: m.id,
    conversacionId: m.conversacionId,
    eliminadoEn: m.eliminadoEn,
  })
}

/** Confirmación de lectura (comms-service `conversacion.lectura`): los demás leyeron hasta `id`. */
export function publicarLectura(conv: Conversacion, id: number) {
  conv.leidoHasta = Math.max(conv.leidoHasta ?? 0, id)
  publish(topicCanal(conv.id), "conversacion.lectura", { conversacionId: conv.id, leidoHasta: conv.leidoHasta })
}

// ---- Simulación -------------------------------------------------------------

const RESPUESTAS = [
  "¡Recibido! Lo reviso y te cuento.",
  "Gracias por avisar, ya mismo lo miro.",
  "Perfecto, quedo atenta.",
  "De acuerdo. ¿Lo hablamos en la reunión de área?",
]
let turno = 0

function escribirComo(conv: Conversacion, autor: { id: number; nombre: string }, despuesMs: number) {
  setTimeout(
    () => publishEphemeral(topicCanal(conv.id), "escribiendo", { usuarioId: autor.id, nombre: autor.nombre }),
    despuesMs,
  )
}

/**
 * Alguien responde al mensaje del usuario: en un DM la otra persona; en un
 * canal, la primera persona mencionada. Responde citando y mencionándolo, así
 * se prueban respuesta, mención, escribiendo, no leídos y notificación.
 */
export function simularRespuesta(conv: Conversacion, original: Mensaje) {
  const mencionado = original.menciones?.find((x) => x.tipo === "USUARIO" && x.usuarioId !== USUARIO_ACTUAL.id)
  const otro =
    conv.tipo === "DIRECTO"
      ? participantes(conv).find((p) => p.id !== USUARIO_ACTUAL.id)
      : mencionado
        ? { id: mencionado.usuarioId as number, nombre: mencionado.nombre }
        : undefined
  if (!otro) return
  // La otra persona lee el mensaje (✓✓) y empieza a escribir.
  setTimeout(() => publicarLectura(conv, original.id), 500)
  escribirComo(conv, otro, 700)
  escribirComo(conv, otro, 2_200)
  setTimeout(() => {
    if (!conversaciones.some((c) => c.id === conv.id)) return
    const texto = `<@${USUARIO_ACTUAL.id}> ${RESPUESTAS[turno++ % RESPUESTAS.length]}`
    const m = nuevoMensaje(
      conv.id,
      texto,
      null,
      {
        respuestaA: citaDe(original),
        menciones: [{ tipo: "USUARIO", usuarioId: USUARIO_ACTUAL.id, nombre: USUARIO_ACTUAL.nombre }],
      },
      autorDe(otro.id, otro.nombre),
    )
    m.meMenciona = true
    publicarMensajeCreado(m, USUARIO_ACTUAL.id)
  }, 3_500)
}

let simulacionIniciada = false

function iniciarSimulacion() {
  if (simulacionIniciada) return
  simulacionIniciada = true

  // Una mención "espontánea" para ver el badge, el divisor y la notificación.
  const canal = conversaciones.find((c) => c.id === 2)
  if (canal) {
    const darlene = { id: 2, nombre: "Darlene Robertson" }
    escribirComo(canal, darlene, 10_000)
    setTimeout(() => {
      const m = nuevoMensaje(
        canal.id,
        `<@${USUARIO_ACTUAL.id}> ¿me ayudas a revisar la planilla de 7°B antes del viernes?`,
        null,
        { menciones: [{ tipo: "USUARIO", usuarioId: USUARIO_ACTUAL.id, nombre: USUARIO_ACTUAL.nombre }] },
        autorDe(darlene.id, darlene.nombre),
      )
      m.meMenciona = true
      publicarMensajeCreado(m)
    }, 12_000)
  }

  // Presencia: alguien se conecta o desconecta cada 15 s.
  let i = 0
  setInterval(() => {
    const lista = miembrosDe(2)
    const m = lista[i++ % lista.length]
    m.enLinea = !m.enLinea
    publishEphemeral("presencia", "presencia.actualizada", { usuarioId: m.id, nombre: m.nombre, enLinea: m.enLinea })
  }, 15_000)
}

onConnect(() => iniciarSimulacion())

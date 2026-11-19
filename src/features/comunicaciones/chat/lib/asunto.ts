import type { Conversacion, Miembro } from "@/features/comunicaciones/chat/api/types"

/**
 * Mensajería interna con asunto (diseño Comunicaciones §4.1–4.6, SSO #1006): cada directo o grupo
 * nace con un asunto (un hilo por asunto). La bandeja y el encabezado lo muestran como título; foros,
 * actividades y el asistente no tienen asunto y siguen con su nombre.
 */

/** Tope del asunto (comms-service: 400 "El asunto admite hasta 120 caracteres."). */
export const MAX_ASUNTO = 120
/** Tope del mensaje (comms-service). */
export const MAX_MENSAJE = 5000
/** Destinatarios de "Enviar por separado" por envío (comms-service). */
export const MAX_DESTINATARIOS_SEPARADO = 200

/** Título del hilo: el asunto o, sin él, el nombre de la conversación. */
export function tituloConversacion(c: Pick<Conversacion, "asunto" | "nombre">): string {
  return c.asunto?.trim() || c.nombre
}

/** "Nelly Silva" → "N. Silva"; un solo nombre queda igual. */
export function abreviarNombre(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length < 2) return partes[0] ?? ""
  return `${partes[0][0].toUpperCase()}. ${partes.slice(1).join(" ")}`
}

/**
 * Contexto de la fila de la bandeja con asunto: "N. Silva" en un directo, "Grupo · 3" en un grupo
 * (diseño M.2.BAN.1). Null sin asunto (la fila sigue como antes).
 */
export function contextoBandeja(c: Pick<Conversacion, "asunto" | "nombre" | "tipo" | "totalMiembros">): string | null {
  if (!c.asunto?.trim()) return null
  if (c.tipo === "GRUPO") return `Grupo · ${c.totalMiembros}`
  if (c.tipo === "DIRECTO") return abreviarNombre(c.nombre)
  return null
}

/**
 * Línea de participantes del encabezado de un grupo: "Grupal · J. Ramírez (creador), C. Medina…".
 * Se muestran hasta `max` y los puntos suspensivos indican que hay más.
 */
export function lineaParticipantesGrupo(miembros: Pick<Miembro, "nombre" | "esCreador" | "estado">[], max = 3): string {
  const activos = miembros.filter((m) => !m.estado || m.estado === "ACTIVO")
  const orden = [...activos.filter((m) => m.esCreador), ...activos.filter((m) => !m.esCreador)]
  const nombres = orden.slice(0, max).map((m) => `${abreviarNombre(m.nombre)}${m.esCreador ? " (creador)" : ""}`)
  if (nombres.length === 0) return "Grupal"
  return `Grupal · ${nombres.join(", ")}${orden.length > max ? "…" : ""}`
}

export type AccionMembresia = "agregó" | "retiró"

/**
 * Evento SISTEMA de membresía de un grupo (SSO #1006): el texto llega como "agregó a <Nombre>" o
 * "retiró a <Nombre>" y el autor es quien agrega o retira. Null si es otro aviso del sistema.
 */
export function eventoMembresia(texto: string | null | undefined): { accion: AccionMembresia; nombre: string } | null {
  const m = /^(agregó|retiró) a (.+?)\.?$/u.exec(texto?.trim() ?? "")
  if (!m) return null
  return { accion: m[1] as AccionMembresia, nombre: m[2] }
}

/** "J. Ramírez agregó a M. López": el front antepone el autor del evento. */
export function textoEventoMembresia(autor: string, evento: { accion: AccionMembresia; nombre: string }): string {
  return `${abreviarNombre(autor)} ${evento.accion} a ${abreviarNombre(evento.nombre)}`
}

import { differenceInMinutes } from "date-fns"

import type { Conversacion, Mensaje, VotacionRapida } from "@/features/comunicaciones/chat/api/types"
import { horaMensaje } from "@/features/comunicaciones/chat/lib/chat-format"
import type { PerfilChat } from "@/features/comunicaciones/chat/lib/politica-chat"

/**
 * Quién ve el original de un mensaje borrado: solo un directivo (coordinador, rector) miembro de la
 * conversación, de cualquier tipo, también un directo (decisión de Natalia). Administrar un foro o
 * crear un grupo no da el permiso, y al autor siempre le llega como eliminado. Misma regla que
 * `ChatService.puedeVerEliminados` de comms-service, que es quien la aplica: el front solo la usa
 * para saber si, ante el evento en vivo `mensaje.eliminado`, vale la pena volver a pedir el
 * historial (el evento no trae el texto).
 */
export function puedeVerEliminados(c: Pick<Conversacion, "tipo"> | undefined, perfil: PerfilChat) {
  return !!c && perfil === "DIRECTIVO"
}

/** Aplica el evento `mensaje.eliminado`: queda el aviso, sin nada del contenido original. */
export function comoEliminado(m: Mensaje, eliminadoEn: string | null | undefined): Mensaje {
  return {
    ...m,
    texto: "",
    adjunto: null,
    adjuntos: [],
    fijado: false,
    reacciones: [],
    menciones: [],
    meMenciona: false,
    respuestaA: null,
    votacion: undefined,
    eliminado: true,
    eliminadoEn: eliminadoEn ?? new Date().toISOString(),
  }
}

export type EstadoLectura = "ENVIADO" | "ENTREGADO" | "LEIDO"

/**
 * Confirmación de lectura de un mensaje propio: ✓ enviado, ✓✓ leído por todos. `leidoHasta` es el
 * menor marcador de lectura de los miembros (comms-service). Sin otra persona en la conversación
 * no hay a quién confirmar.
 */
export function estadoLectura(
  m: Mensaje,
  c: Pick<Conversacion, "leidoHasta" | "totalMiembros"> | undefined,
): EstadoLectura | null {
  if (!m.esPropio || m.sistema || m.eliminado || !c || c.totalMiembros < 2) return null
  // Pidió confirmación de lectura (HU 7): el estado lo calcula comms-service por receptor.
  if (m.confirmacion) return m.confirmacion.estado
  return c.leidoHasta != null && m.id <= c.leidoHasta ? "LEIDO" : "ENVIADO"
}

/** Marca de edición como prefijo, igual que el diseño: "Editado 7:33 AM". */
export function marcaEdicion(m: Pick<Mensaje, "editado" | "editadoEn">): string | null {
  if (!m.editado) return null
  return m.editadoEn ? `Editado ${horaMensaje(m.editadoEn)}` : "Editado"
}

/** "Editado hace 2 min" (votación rápida). */
export function haceCuanto(fecha: string, ahora = Date.now()): string {
  const min = Math.max(0, differenceInMinutes(ahora, new Date(fecha)))
  if (min < 1) return "hace un momento"
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  return `hace ${h} ${h === 1 ? "hora" : "horas"}`
}

/** Mensajes fijados vivos, del más reciente al más antiguo (barra bajo el encabezado). */
export function mensajesFijados(mensajes: Mensaje[]): Mensaje[] {
  return mensajes.filter((m) => m.fijado && !m.eliminado && !m.sistema).reverse()
}

/**
 * Quien vota ve el aviso "La votación fue modificada y se reiniciaron los votos" mientras siga
 * abierta y no haya vuelto a votar. Editar la votación marca el mensaje como editado (comms-service
 * `reemplazarVotacion`) y borra los votos de TODOS, incluido el del creador: por eso el Figma
 * (4123:67058) muestra el aviso también en la tarjeta propia, junto a editar/eliminar.
 */
export function votacionModificada(m: Mensaje, v: VotacionRapida, abierta: boolean) {
  return abierta && m.editado && v.miVoto == null
}

export const ETIQUETA_PERFIL: Record<PerfilChat, string> = {
  DIRECTIVO: "Directivo",
  DOCENTE: "Docente",
  ACUDIENTE: "Acudiente",
  ESTUDIANTE: "Estudiante",
}

/**
 * Rol que acompaña al nombre en los listados de personas del chat (QA 57: solo nombre y rol, nunca
 * correo ni documento). `cargo` lo calcula comms-service desde los roles del SSO (Rector,
 * Coordinador…); sin él, la etiqueta del perfil de la política.
 */
export function rolVisible(p: { cargo?: string; perfil?: PerfilChat }): string {
  return p.cargo || (p.perfil ? ETIQUETA_PERFIL[p.perfil] : "")
}

const MAX_RECIENTES = 5

/** Búsquedas recientes del buscador del chat: la última primero, sin repetir, máximo 5. */
export function agregarReciente(recientes: string[], termino: string): string[] {
  const t = termino.trim()
  if (t.length < 2) return recientes
  return [t, ...recientes.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, MAX_RECIENTES)
}

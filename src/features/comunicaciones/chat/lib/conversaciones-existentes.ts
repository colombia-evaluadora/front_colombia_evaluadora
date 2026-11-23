import type { Conversacion, DisponibilidadDirecto } from "@/features/comunicaciones/chat/api/types"

/** Hilo directo ya abierto con una persona (lo que muestra el aviso de «Nuevo mensaje»). */
export interface HiloExistente {
  id: number
  asunto: string
}

/**
 * Directos vigentes con cada persona, por id de persona. Cada «Nuevo mensaje» crea un hilo nuevo
 * por asunto (SSO #1006), así que no se bloquea: solo se informa para que pueda continuar uno.
 *
 * `Conversacion` no trae a la otra persona del directo: la relación conversación → usuario sale de
 * `GET /comunicaciones/disponibilidad/directos` (la misma carga que pinta la presencia en la bandeja).
 * Se excluye lo que la bandeja no muestra como directo vigente: archivadas, el asistente (bot) y los
 * hilos de los que la persona fue retirada. Orden: el de la bandeja (más reciente primero).
 */
export function conversacionesExistentesPorPersona(
  conversaciones: Conversacion[],
  directos: DisponibilidadDirecto[],
  personaIds: number[],
): Map<number, HiloExistente[]> {
  const buscadas = new Set(personaIds)
  const usuarioDe = new Map(directos.map((d) => [d.conversacionId, d.usuarioId]))
  const resultado = new Map<number, HiloExistente[]>()
  for (const c of conversaciones) {
    if (c.tipo !== "DIRECTO" || c.archivada || c.esBot || c.retirado) continue
    const usuarioId = usuarioDe.get(c.id)
    if (usuarioId == null || !buscadas.has(usuarioId)) continue
    const lista = resultado.get(usuarioId) ?? []
    lista.push({ id: c.id, asunto: c.asunto?.trim() || c.nombre })
    resultado.set(usuarioId, lista)
  }
  return resultado
}

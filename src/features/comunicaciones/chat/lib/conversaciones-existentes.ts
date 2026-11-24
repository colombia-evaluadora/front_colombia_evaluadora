import type { Conversacion, DisponibilidadDirecto } from "@/features/comunicaciones/chat/api/types"
import type { ModoNuevoMensaje } from "@/features/comunicaciones/chat/lib/nuevo-mensaje"

/** Hilo directo ya abierto con una persona (lo que muestra el aviso de «Nuevo mensaje»). */
export interface HiloExistente {
  id: number
  asunto: string
}

// Más reciente primero: por el último mensaje y, sin mensajes, por id (comms-service ordena la
// bandeja por pk ascendente, así que el orden de llegada NO es el de recencia).
const reciente = (c: Conversacion) => c.ultimoMensaje?.enviadoEn ?? ""
function porRecencia(a: Conversacion, b: Conversacion) {
  const ra = reciente(a)
  const rb = reciente(b)
  if (ra !== rb) return ra < rb ? 1 : -1
  return b.id - a.id
}

/**
 * Directos vigentes con cada persona, por id de persona (`users.id_user`, el de `/personas`). Cada
 * «Nuevo mensaje» crea un hilo nuevo por asunto (SSO #1006), así que no se bloquea: solo se informa.
 *
 * La otra persona sale de `Conversacion.contraparteId` (comms-service, QA 106) y, si el backend aún
 * no lo envía, de `GET /comunicaciones/disponibilidad/directos`. Se excluye lo que la bandeja no
 * muestra como directo vigente: archivadas, el asistente (bot) y los hilos de los que fue retirado.
 * Cada lista queda con el más reciente primero.
 */
export function conversacionesExistentesPorPersona(
  conversaciones: Conversacion[],
  directos: DisponibilidadDirecto[],
  personaIds: number[],
): Map<number, HiloExistente[]> {
  const buscadas = new Set(personaIds.map(Number))
  const usuarioDe = new Map(directos.map((d) => [Number(d.conversacionId), Number(d.usuarioId)]))
  const vigentes = conversaciones
    .filter((c) => c.tipo === "DIRECTO" && !c.archivada && !c.esBot && !c.retirado)
    .sort(porRecencia)
  const resultado = new Map<number, HiloExistente[]>()
  for (const c of vigentes) {
    const usuarioId = c.contraparteId != null ? Number(c.contraparteId) : usuarioDe.get(Number(c.id))
    if (usuarioId == null || !buscadas.has(usuarioId)) continue
    const lista = resultado.get(usuarioId) ?? []
    lista.push({ id: c.id, asunto: c.asunto?.trim() || c.nombre })
    resultado.set(usuarioId, lista)
  }
  return resultado
}

/** «Ana», «Ana y Luis», «Ana, Luis y Rosa». */
export function unirNombres(nombres: string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? ""
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`
}

/** Qué aviso mostrar bajo «Para» según el modo (QA 106). */
export type AvisoExistentes =
  | { tipo: "INDIVIDUAL"; texto: string; hilos: HiloExistente[] }
  | { tipo: "SEPARADO"; nombres: string[] }

/**
 * Individual: «Ya tiene una conversación con esta persona.» (o «Ya tiene N conversaciones…») con los
 * hilos de la persona elegida, el más reciente primero (lo abre «Abrir»). Enviar por separado: los
 * nombres de las personas elegidas que ya tienen conversación, en el orden del Para. Grupal o sin
 * conversaciones previas: nada.
 */
export function avisoConversacionesExistentes(
  modo: ModoNuevoMensaje,
  para: { id: number; nombre: string }[],
  existentes: Map<number, HiloExistente[]>,
): AvisoExistentes | null {
  if (modo === "GRUPAL") return null
  const con = para.filter((p) => (existentes.get(Number(p.id))?.length ?? 0) > 0)
  if (con.length === 0) return null
  if (modo === "INDIVIDUAL") {
    const hilos = existentes.get(Number(con[0].id)) ?? []
    const texto =
      hilos.length === 1
        ? "Ya tiene una conversación con esta persona."
        : `Ya tiene ${hilos.length} conversaciones con esta persona.`
    return { tipo: "INDIVIDUAL", texto, hilos }
  }
  return { tipo: "SEPARADO", nombres: con.map((p) => p.nombre) }
}

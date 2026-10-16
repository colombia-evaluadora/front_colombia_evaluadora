import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import { personalizarMensaje } from "@/features/comunicaciones/chat/lib/personalizar-mensaje"
import type {
  ColorEtiqueta,
  NodoRespuesta,
  OrdenForo,
  Publicacion,
} from "@/features/comunicaciones/foros/api/types"

/**
 * Lógica pura de los foros (testeable sin DOM): hilado de respuestas, fusión
 * de eventos del socket y textos de la UI.
 */

export const ETIQUETA_ORDEN: Record<OrdenForo, string> = {
  ACTIVIDAD: "Actividad reciente",
  NUEVAS: "Más nuevas",
  TOP: "Más votadas",
}

// Clases escritas literalmente: Tailwind no ve nombres armados.
export const CLASE_ETIQUETA: Record<ColorEtiqueta, string> = {
  BLUE: "border-blue-stroke bg-blue-22 text-blue",
  GREEN: "border-green-stroke bg-green-22 text-green",
  YELLOW: "border-yellow-stroke bg-yellow-22 text-yellow",
  RED: "border-red-stroke bg-red-22 text-red",
  PURPLE: "border-purple-stroke bg-purple-22 text-purple",
  ORANGE: "border-orange-stroke bg-orange-22 text-orange",
  NAVY: "border-navy-stroke bg-navy-22 text-navy",
}

export const NOMBRE_COLOR: Record<ColorEtiqueta, string> = {
  BLUE: "Azul",
  GREEN: "Verde",
  YELLOW: "Amarillo",
  RED: "Rojo",
  PURPLE: "Morado",
  ORANGE: "Naranja",
  NAVY: "Azul oscuro",
}

/**
 * Arma el árbol de respuestas por `respuestaA.id`. Una respuesta que cita a un
 * mensaje que no está en la lista (el cuerpo de la publicación o una respuesta
 * eliminada) queda en el primer nivel. Orden cronológico en cada nivel.
 */
export function arbolRespuestas(respuestas: readonly Mensaje[]): NodoRespuesta[] {
  const nodos = new Map<number, NodoRespuesta>()
  const ordenadas = [...respuestas].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)
  for (const m of ordenadas) nodos.set(m.id, { mensaje: m, hijas: [] })
  const raices: NodoRespuesta[] = []
  for (const m of ordenadas) {
    const nodo = nodos.get(m.id) as NodoRespuesta
    const padre = m.respuestaA && !m.respuestaA.eliminado ? nodos.get(m.respuestaA.id) : undefined
    if (padre && padre !== nodo) padre.hijas.push(nodo)
    else raices.push(nodo)
  }
  return raices
}

/** Profundidad máxima con sangría; más abajo se sigue mostrando sin sangrar (como Discourse). */
export const PROFUNDIDAD_MAXIMA = 3

/** Lo que depende de quién mira: `esPropia` y el cuerpo personalizado. */
export function personalizarPublicacion(p: Publicacion, userId: number | null | undefined): Publicacion {
  if (userId == null) return p
  return {
    ...p,
    esPropia: p.autor.id === userId,
    mensaje: p.mensaje ? personalizarMensaje(p.mensaje, userId) : p.mensaje,
  }
}

/**
 * Evento `publicacion.actualizada` (forma neutra) sobre lo que ya había: el
 * socket no sabe si el visor sigue la publicación, así que se conserva, y el
 * listado no trae el cuerpo.
 */
export function fusionarPublicacion(prev: Publicacion | undefined, nueva: Publicacion): Publicacion {
  if (!prev) return nueva
  return {
    ...nueva,
    siguiendo: prev.siguiendo,
    totalCount: prev.totalCount,
    mensaje: nueva.mensaje ?? prev.mensaje,
  }
}

/** Extracto legible: los tokens `<@id>` se muestran como "@persona". */
export function extractoPlano(extracto: string): string {
  return extracto.replace(/<@\d{1,18}>/g, "@persona").replace(/\s+/g, " ").trim()
}

export function textoRespuestas(n: number): string {
  if (n === 0) return "Sin respuestas"
  return n === 1 ? "1 respuesta" : `${n} respuestas`
}

/** "Cerrada", "Resuelta"…: estados que se muestran como insignias, en orden. */
export function estadosPublicacion(p: Pick<Publicacion, "fijada" | "cerrada" | "resuelta">) {
  const out: ("FIJADA" | "RESUELTA" | "CERRADA")[] = []
  if (p.fijada) out.push("FIJADA")
  if (p.resuelta) out.push("RESUELTA")
  if (p.cerrada) out.push("CERRADA")
  return out
}

/** Puede responder: política + publicación abierta (la moderación responde aunque esté cerrada). */
export function puedeResponderEn(
  p: Pick<Publicacion, "cerrada">,
  permisos: { puedeResponder: boolean; puedeModerar: boolean },
): boolean {
  if (!permisos.puedeResponder && !permisos.puedeModerar) return false
  return !p.cerrada || permisos.puedeModerar
}

/** Marca o desmarca resuelta: quien publicó o la moderación. */
export const puedeResolver = (p: Pick<Publicacion, "esPropia">, puedeModerar: boolean) => p.esPropia || puedeModerar

/** Etiquetas que el usuario puede poner: las "solo moderadores" solo la moderación. */
export const etiquetasDisponibles = <T extends { soloModeradores: boolean }>(etiquetas: readonly T[], puedeModerar: boolean) =>
  etiquetas.filter((e) => puedeModerar || !e.soloModeradores)

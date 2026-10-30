import type { Conversacion } from "@/features/comunicaciones/chat/api/types"
import type { PerfilChat } from "@/features/comunicaciones/chat/lib/politica-chat"

/** Categorías con actividad propia que se editan con su diálogo de creación ("Editar …"). */
export const CATEGORIAS_EDITABLES = ["VOTACION", "ENCUESTA", "EXAMEN", "ANUNCIO"] as const

export const ETIQUETA_EDITAR: Record<(typeof CATEGORIAS_EDITABLES)[number], string> = {
  VOTACION: "Editar elección",
  ENCUESTA: "Editar encuesta",
  EXAMEN: "Editar evaluación",
  ANUNCIO: "Editar comunicado",
}

export const esCategoriaActividad = (categoria: string) =>
  (CATEGORIAS_EDITABLES as readonly string[]).includes(categoria)

/**
 * Quien gestiona una actividad (editar, cerrar, eliminar, informe): misma regla que
 * `BaseActividades#gestiona` de comms-service (Natalia). El creador solo mientras sigue en el
 * canal, los ADMIN del canal y los directivos miembros. La lista de conversaciones solo trae los
 * canales donde la persona es miembro activo, así que `esCreador` ya implica "sigue dentro".
 */
export const gestionaActividad = (c: Pick<Conversacion, "esAdmin" | "esCreador">, perfil: PerfilChat) =>
  !!c.esAdmin || !!c.esCreador || perfil === "DIRECTIVO"

export const esActividadEditable = (
  c: Pick<Conversacion, "categoria" | "esCreador" | "esAdmin">,
  perfil: PerfilChat,
) => esCategoriaActividad(c.categoria) && gestionaActividad(c, perfil)

export const MENSAJE_EN_CURSO = "No se puede editar ni eliminar mientras está en curso."
export const MENSAJE_FINALIZADA = "No se puede editar porque ya finalizó: sus resultados quedan fijos."

const CON_VENTANA: readonly string[] = ["VOTACION", "ENCUESTA", "EXAMEN"]

/**
 * QA 79: una elección, encuesta o evaluación solo se edita mientras está programada (aún no
 * inicia). En curso no se edita ni se elimina; finalizada no se edita (los resultados quedan fijos)
 * pero sí se elimina. comms-service manda `actividadEstado` calculado con el reloj del servidor y
 * valida lo mismo al editar/eliminar (409); si no llega (back anterior), se infiere "en curso" del
 * punto verde `actividadAbierta`. Devuelve el motivo del bloqueo (tooltip) o null si se permite.
 */
export function bloqueoActividad(
  c: Pick<Conversacion, "categoria" | "actividadAbierta" | "actividadEstado">,
): { editar: string | null; eliminar: string | null } {
  if (!CON_VENTANA.includes(c.categoria)) return { editar: null, eliminar: null }
  const estado = c.actividadEstado ?? (c.actividadAbierta ? "EN_CURSO" : null)
  if (estado === "EN_CURSO") return { editar: MENSAJE_EN_CURSO, eliminar: MENSAJE_EN_CURSO }
  if (estado === "FINALIZADA") return { editar: MENSAJE_FINALIZADA, eliminar: null }
  return { editar: null, eliminar: null }
}

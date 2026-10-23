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

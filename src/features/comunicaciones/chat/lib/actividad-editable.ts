import type { Conversacion } from "@/features/comunicaciones/chat/api/types"

/** Categorías con actividad propia que se editan con su diálogo de creación ("Editar …"). */
export const CATEGORIAS_EDITABLES = ["VOTACION", "ENCUESTA", "EXAMEN", "ANUNCIO"] as const

export const ETIQUETA_EDITAR: Record<(typeof CATEGORIAS_EDITABLES)[number], string> = {
  VOTACION: "Editar elección",
  ENCUESTA: "Editar encuesta",
  EXAMEN: "Editar evaluación",
  ANUNCIO: "Editar comunicado",
}

export const esActividadEditable = (c: Pick<Conversacion, "categoria" | "esCreador">) =>
  !!c.esCreador && (CATEGORIAS_EDITABLES as readonly string[]).includes(c.categoria)

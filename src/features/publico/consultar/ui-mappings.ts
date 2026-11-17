import type { EstadoInscripcionPublica } from "@/features/publico/consultar/datos-demo"

type ColorBadge = "success" | "orange" | "info" | "muted" | "destructive" | "neutral"

export const ESTADO_INSCRIPCION: Record<EstadoInscripcionPublica, { label: string; color: ColorBadge }> = {
  INSCRITA: { label: "Inscrita", color: "info" },
  POR_ELEGIR: { label: "Por elegir", color: "orange" },
  UBICACION_PROPUESTA: { label: "Ubicación propuesta", color: "orange" },
  UBICADO: { label: "Ubicado", color: "success" },
  ADMITIDA: { label: "Admitida", color: "success" },
  SIN_CUPO: { label: "Sin cupo", color: "muted" },
  ANULADA: { label: "Anulada", color: "muted" },
}

/** Subtítulo de la franja según lo que la familia tiene que hacer. */
export const SUBTITULO_ESTADO: Record<EstadoInscripcionPublica, string> = {
  INSCRITA: "Estado de cada opción de cupo.",
  POR_ELEGIR: "Estado de cada opción y elección del cupo.",
  UBICACION_PROPUESTA: "Confirme o rechace la ubicación propuesta.",
  UBICADO: "Ubicación directa: confirme que recibió la notificación.",
  ADMITIDA: "Estado de cada opción de cupo.",
  SIN_CUPO: "Estado de cada opción de cupo.",
  ANULADA: "Estado de cada opción de cupo.",
}

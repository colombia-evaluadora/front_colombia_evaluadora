import type {
  EstadoInscripcion,
  EstadoOpcion,
  RevisionSoporte,
  SituacionEdad,
} from "@/features/coverage/inscripcion-reservas/api/types/inscripcion"

type BadgeColor = "success" | "orange" | "info" | "muted" | "destructive" | "neutral"

export const ESTADO_OPCION_UI: Record<
  EstadoOpcion,
  { label: string; color: BadgeColor; punto: boolean }
> = {
  PENDIENTE: { label: "Pendiente", color: "neutral", punto: false },
  EN_LISTA_ESPERA: { label: "En lista de espera", color: "orange", punto: true },
  ADMITIDA: { label: "Admitida", color: "success", punto: true },
  NO_ADMITIDA: { label: "No admitida", color: "destructive", punto: true },
  DESCARTADA: { label: "Descartada", color: "muted", punto: false },
}

// En edad es la situación normal: va neutra. Las demás llaman la atención.
export const SITUACION_EDAD_UI: Record<
  SituacionEdad,
  { label: string; color: BadgeColor; punto: boolean }
> = {
  EN_EDAD: { label: "En edad", color: "neutral", punto: false },
  PREEXTRAEDAD: { label: "Preextraedad", color: "info", punto: true },
  EXTRAEDAD: { label: "Extraedad", color: "orange", punto: true },
  BAJA_EDAD: { label: "Baja edad", color: "orange", punto: true },
  SIN_CALCULAR: { label: "Sin calcular", color: "muted", punto: false },
}

export const DESEMPATE_LABEL = {
  SORTEO: "sorteo",
  ORDEN_INSCRIPCION: "orden de inscripción",
} as const

export const ESTADO_INSCRIPCION_UI: Record<
  EstadoInscripcion,
  { label: string; color: BadgeColor; punto: boolean }
> = {
  INSCRITA: { label: "Inscrita", color: "info", punto: true },
  EN_LISTA_ESPERA: { label: "En lista de espera", color: "orange", punto: true },
  POR_ELEGIR: { label: "Por elegir", color: "info", punto: true },
  ADMITIDA: { label: "Admitida", color: "success", punto: true },
  ANULADA: { label: "Anulada", color: "muted", punto: false },
}

export const REVISION_SOPORTE_UI: Record<
  RevisionSoporte,
  { label: string; color: BadgeColor; punto: boolean }
> = {
  SOPORTADO: { label: "Soportado", color: "success", punto: true },
  SIN_REVISAR: { label: "Sin revisar", color: "neutral", punto: false },
  SIN_ARCHIVO: { label: "Sin archivo", color: "neutral", punto: false },
  RECHAZADO: { label: "Rechazado", color: "destructive", punto: true },
}

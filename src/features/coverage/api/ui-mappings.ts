import type {
  EducationLevel,
  ReservationGroupBy,
  ReservationStatus,
  Shift,
} from "@/features/coverage/api/types/reservation"

type BadgeColor = "primary" | "secondary" | "destructive" | "info" | "warning" | "success"
interface BadgeProps {
  variant: "soft"
  color: BadgeColor
}

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  PREESCOLAR: "Preescolar",
  BASICA_PRIMARIA: "Básica primaria",
  BASICA_SECUNDARIA: "Básica secundaria",
  MEDIA: "Media",
}

// Versión corta para los ejes de los gráficos: "Básica secundaria" parte en
// dos líneas y desalinea las barras.
export const EDUCATION_LEVEL_SHORT_LABELS: Record<EducationLevel, string> = {
  PREESCOLAR: "Preescolar",
  BASICA_PRIMARIA: "Primaria",
  BASICA_SECUNDARIA: "Secundaria",
  MEDIA: "Media",
}

export const SHIFT_LABELS: Record<Shift, string> = {
  MANANA: "Mañana",
  TARDE: "Tarde",
  UNICA: "Única",
  COMPLETA: "Completa",
  NOCTURNA: "Nocturna",
}

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  confirmada: "Confirmada",
  pendiente: "Pendiente",
  vencida: "Vencida",
}

export const RESERVATION_STATUS_BADGE: Record<ReservationStatus, BadgeProps> = {
  confirmada: { variant: "soft", color: "success" },
  pendiente: { variant: "soft", color: "warning" },
  vencida: { variant: "soft", color: "destructive" },
}

export const RESERVATION_GROUP_BY_LABELS: Record<ReservationGroupBy, string> = {
  institution: "Institución educativa",
  campus: "Sede",
  grade: "Grado",
  group: "Grupo",
  shift: "Jornada",
  educationLevel: "Nivel educativo",
}

/** "0°" para transición, "3°", "11°"… igual que en el diseño. */
export function formatGrade(grade: number): string {
  return `${grade}°`
}

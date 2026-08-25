import type {
  EducationLevel,
  ReservationGroupBy,
  ReservationStatus,
  Shift,
} from "@/features/coverage/api/types/reservation"

export type BadgeColor = "primary" | "secondary" | "destructive" | "info" | "warning" | "success"
export interface BadgeProps {
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

// ── Catálogos de Pre-Matrícula ────────────────────────────────────────────────
// Se comparten entre los formularios/dialogs y los mocks de MSW para que las
// opciones mostradas coincidan siempre con los datos generados.

export const DOCUMENT_TYPE_OPTIONS = [
  "CC Cédula de Ciudadanía",
  "TI Tarjeta de Identidad",
  "CE Cédula de Extranjería",
  "RC Registro Civil",
]

export const GENDER_OPTIONS = ["Masculino", "Femenino"]

export const RESIDENCE_OPTIONS = [
  "Bogotá",
  "Medellín",
  "Cali",
  "Cartagena",
  "Barranquilla",
  "Bucaramanga",
  "Manizales",
  "Pereira",
  "Santa Marta",
  "Ibagué",
]

export const RELATIONSHIP_OPTIONS = [
  "Padre",
  "Madre",
  "Abuelo/a",
  "Tío/a",
  "Hermano/a",
  "Tutor legal",
]

/** Grados posibles: 0 (transición) a 11. */
export const GRADE_OPTIONS = Array.from({ length: 12 }, (_, grade) => grade)

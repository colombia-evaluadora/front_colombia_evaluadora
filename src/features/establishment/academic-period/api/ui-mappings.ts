import type { AcademicPeriodStatus } from "./types/academic-period"
import type { EvaluationPeriodStatus } from "./types/evaluation-period"
import type { RatingScaleType } from "./types/rating-scales"

type BadgeColor = "primary" | "secondary" | "destructive" | "info" | "warning" | "success"
interface BadgeProps {
  variant: "fill" | "outline"
  color: BadgeColor
}

export const ACADEMIC_PERIOD_STATUS_LABELS: Record<AcademicPeriodStatus, string> = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
}

export const ACADEMIC_PERIOD_STATUS_BADGE: Record<AcademicPeriodStatus, BadgeProps> = {
  ACTIVO: { variant: "fill", color: "success" },
  INACTIVO: { variant: "fill", color: "secondary" },
}

export const EVALUATION_PERIOD_STATUSES: EvaluationPeriodStatus[] = [
  "NO Calificable",
  "Calificable",
  "En Recuperaciones",
  "Habilitados para algunas asignaturas",
]

export const EVALUATION_PERIOD_STATUS_BADGE: Record<
  EvaluationPeriodStatus,
  BadgeProps
> = {
  "Habilitados para algunas asignaturas": { variant: "fill", color: "secondary" },
  "Calificable": { variant: "fill", color: "info" },
  "En Recuperaciones": { variant: "fill", color: "warning" },
  "NO Calificable": { variant: "fill", color: "success" },
}

export const RATING_SCALE_TYPE_BADGE: Record<RatingScaleType, BadgeProps> = {
  Fortaleza: { variant: "fill", color: "success" },
  Debilidad: { variant: "fill", color: "destructive" },
}

export const SEDE_OPTIONS: { id: number; name: string }[] = [
  { id: 1, name: "I.E. JORGE GARCÍA LA SALLE BICENTENARIO" },
  { id: 2, name: "I.E. NUESTRA SEÑORA DE FÁTIMA" },
  { id: 3, name: "I.E. CLEMENTE MANUEL ZABALA" },
]

export const JORNADA_OPTIONS: { id: number; name: string }[] = [
  { id: 1, name: "Mañana" },
  { id: 2, name: "Tarde" },
  { id: 3, name: "Noche" },
]
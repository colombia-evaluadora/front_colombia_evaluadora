import type { AcademicPeriodStatus } from "./types/academic-period"
import type { EvaluationPeriodStatus } from "./types/evaluation-period"
import type { RatingScaleType } from "./types/rating-scales"

type BadgeColor = "primary" | "secondary" | "destructive" | "info" | "warning" | "success"
interface BadgeProps {
  variant: "fill" | "outline"
  color: BadgeColor
}

// Las etiquetas de estado ahora las entrega el backend (`{ key, label }`, vía
// `useAcademicPeriodStatusesQuery`). Acá solo queda el color del badge, que el
// back no envía.
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

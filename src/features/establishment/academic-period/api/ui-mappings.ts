import type { AcademicPeriodStatus } from "./types/academic-period"
import type { EvaluationPeriodStatus } from "./types/evaluation-period"
import type { RatingScaleType } from "./types/rating-scales"

type BadgeColor = "primary" | "secondary" | "muted" | "destructive" | "info" | "warning" | "success"
interface BadgeProps {
  variant: "fill" | "outline" | "soft"
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
  "Habilitados para algunas asignaturas": { variant: "soft", color: "muted" },
  "Calificable": { variant: "soft", color: "success" },
  "En Recuperaciones": { variant: "soft", color: "warning" },
  "NO Calificable": { variant: "soft", color: "info" },
}

export const RATING_SCALE_TYPE_BADGE: Record<RatingScaleType, BadgeProps> = {
  Fortaleza: { variant: "fill", color: "success" },
  Debilidad: { variant: "fill", color: "destructive" },
}

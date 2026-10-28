import type { AcademicPeriodStatus } from "@/features/establishment/academic-period/api/types/academic-period"
import type { EvaluationPeriodStatus } from "@/features/establishment/academic-period/api/types/evaluation-period"

type BadgeColor =
  | "primary"
  | "secondary"
  | "muted"
  | "destructive"
  | "info"
  | "warning"
  | "orange"
  | "success"
  | "neutral"
interface BadgeProps {
  variant: "soft" | "outline"
  color: BadgeColor
}

export const ACADEMIC_PERIOD_STATUS_BADGE: Record<AcademicPeriodStatus, BadgeProps> = {
  A: { variant: "soft", color: "success" },
  N: { variant: "soft", color: "secondary" },
  I: { variant: "soft", color: "info" },
  P: { variant: "soft", color: "warning" },
  // Cerrado en gris: ya no admite cambios, no es un error.
  C: { variant: "soft", color: "muted" },
}

export const RESERVATION_STATUS_BADGE: Record<
  "active" | "inactive",
  BadgeProps
> = {
  active: { variant: "soft", color: "success" },
  inactive: { variant: "soft", color: "muted" },
}

export const EVALUATION_PERIOD_STATUSES: EvaluationPeriodStatus[] = [
  "1",
  "2",
]

export const EVALUATION_PERIOD_STATUS_BADGE: Record<
  EvaluationPeriodStatus,
  BadgeProps
> = {
  "1": { variant: "soft", color: "success" },
  "2": { variant: "outline", color: "neutral" },
}

export function evaluationPeriodStatusByDates(
  startDate: string,
  endDate: string,
  today: string,
): EvaluationPeriodStatus {
  return startDate <= today && today <= endDate ? "1" : "2"
}

export const RATING_SCALE_TYPE_BADGE: Record<string, BadgeProps> = {
  Fortaleza: { variant: "soft", color: "success" },
  Debilidad: { variant: "soft", color: "destructive" },
}

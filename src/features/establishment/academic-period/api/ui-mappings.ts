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
interface BadgeProps {
  variant: "soft"
  color: BadgeColor
}

export const ACADEMIC_PERIOD_STATUS_BADGE: Record<AcademicPeriodStatus, BadgeProps> = {
  A: { variant: "soft", color: "success" },
  N: { variant: "soft", color: "secondary" },
  I: { variant: "soft", color: "info" },
  P: { variant: "soft", color: "warning" },
  C: { variant: "soft", color: "destructive" },
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
  "2": { variant: "soft", color: "muted" },
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

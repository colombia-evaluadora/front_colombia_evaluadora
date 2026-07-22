import type { AcademicPeriodStatus } from "./types/academic-period/academic-period"

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

export const JORNADA_OPTIONS: { id: number; name: string }[] = [
  { id: 1, name: "Mañana" },
  { id: 2, name: "Tarde" },
  { id: 3, name: "Noche" },
]
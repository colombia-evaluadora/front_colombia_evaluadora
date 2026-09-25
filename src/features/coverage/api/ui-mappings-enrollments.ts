import type { BadgeProps } from "@/features/coverage/api/ui-mappings"
import type { EnrollmentStatus } from "@/features/coverage/api/types/enrollment"

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  sin_asignar_cupo: "Sin asignar cupos",
  cupo_asignado: "Cupo asignado",
}

export const ENROLLMENT_STATUS_BADGE: Record<EnrollmentStatus, BadgeProps> = {
  sin_asignar_cupo: { variant: "soft", color: "warning" },
  cupo_asignado: { variant: "soft", color: "success" },
}

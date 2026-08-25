import type { BadgeProps } from "@/features/coverage/api/ui-mappings"
import type { EnrollmentStatus } from "@/features/coverage/api/types/enrollment"

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  recibida: "Recibida",
  en_revision: "En revisión",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
}

export const ENROLLMENT_STATUS_BADGE: Record<EnrollmentStatus, BadgeProps> = {
  recibida: { variant: "soft", color: "info" },
  en_revision: { variant: "soft", color: "warning" },
  aceptada: { variant: "soft", color: "success" },
  rechazada: { variant: "soft", color: "destructive" },
}

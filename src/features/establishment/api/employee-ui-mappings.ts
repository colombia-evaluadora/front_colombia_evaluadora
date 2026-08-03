import type { PermissionStatus } from "./types/permission"

type BadgeColor = "success" | "destructive"

interface BadgeProps {
  variant: "fill"
  color: BadgeColor
}

export const EMPLOYEE_STATUS_LABELS: Record<PermissionStatus, string> = {
  ACTIVE: "Activo",
  SUSPENDED: "Suspendido",
}

export const EMPLOYEE_STATUS_BADGE: Record<PermissionStatus, BadgeProps> = {
  ACTIVE: {
    variant: "fill",
    color: "success",
  },
  SUSPENDED: {
    variant: "fill",
    color: "destructive",
  },
}
import type { PermissionStatus } from "@/features/establishment/institution/api/types/permission"

type BadgeColor = "success" | "destructive"

interface BadgeProps {
  variant: "soft"
  color: BadgeColor
}

export const EMPLOYEE_STATUS_LABELS: Record<PermissionStatus, string> = {
  ACTIVE: "Activo",
  SUSPENDED: "Suspendido",
}

export const EMPLOYEE_STATUS_BADGE: Record<PermissionStatus, BadgeProps> = {
  ACTIVE: {
    variant: "soft",
    color: "success",
  },
  SUSPENDED: {
    variant: "soft",
    color: "destructive",
  },
}
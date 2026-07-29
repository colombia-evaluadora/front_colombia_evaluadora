import type { EmployeeStatus } from "./types/employee"

type BadgeColor = "success" | "destructive"

interface BadgeProps {
  variant: "fill"
  color: BadgeColor
}

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: "Activo",
  SUSPENDED: "Suspendido",
}

export const EMPLOYEE_STATUS_BADGE: Record<EmployeeStatus, BadgeProps> = {
  ACTIVE: {
    variant: "fill",
    color: "success",
  },
  SUSPENDED: {
    variant: "fill",
    color: "destructive",
  },
}
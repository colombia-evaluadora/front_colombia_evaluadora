import type { SessionStatus } from "./types/audit"
import type { OperationType } from "./types/audit-table"

type BadgeColor = "primary" | "secondary" | "destructive" | "info" | "warning" | "success"
interface BadgeProps {
  variant: "fill" | "outline"
  color: BadgeColor
}

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  active: "Activo",
  closed: "Cerrada",
}

export const SESSION_STATUS_BADGE: Record<SessionStatus, BadgeProps> = {
  active: { variant: "fill", color: "success" },
  closed: { variant: "fill", color: "secondary" },
}

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  INSERT: "Insert",
  UPDATE: "Update",
  DELETE: "Delete",
}

export const OPERATION_TYPE_BADGE: Record<OperationType, BadgeProps> = {
  INSERT: { variant: "fill", color: "info" },
  UPDATE: { variant: "fill", color: "warning" },
  DELETE: { variant: "fill", color: "destructive" },
}

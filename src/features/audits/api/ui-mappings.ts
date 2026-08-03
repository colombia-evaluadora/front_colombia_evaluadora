import type { SessionStatus } from "./types/audit"
import type { OperationType } from "./types/audit-table"

type BadgeColor = "primary" | "secondary" | "destructive" | "info" | "warning" | "success"
interface BadgeProps {
  variant: "fill" | "outline"
  color: BadgeColor
}

// Las etiquetas de estado y tipo de operación ahora las entrega el backend
// (`{ key, label }`, vía `useAuditSessionStatusesQuery` y
// `useAuditOperationTypesQuery`). Acá solo queda el color del badge, que
// el back no envía.
export const SESSION_STATUS_BADGE: Record<SessionStatus, BadgeProps> = {
  active: { variant: "fill", color: "success" },
  closed: { variant: "fill", color: "secondary" },
}

export const OPERATION_TYPE_BADGE: Record<OperationType, BadgeProps> = {
  INSERT: { variant: "fill", color: "info" },
  UPDATE: { variant: "fill", color: "warning" },
  DELETE: { variant: "fill", color: "destructive" },
}
import type { SessionStatus } from "./types/audit"

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  active: "Activo",
  closed: "Cerrada",
}

export const SESSION_STATUS_VARIANTS: Record<
  SessionStatus,
  "outline" | "secondary" | "default" | "destructive"
> = {
  active: "default",
  closed: "secondary",
}

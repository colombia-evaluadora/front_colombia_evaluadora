import type { SessionStatus } from "./types/audit"
import type { OperationType } from "./types/audit-table"

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

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  INSERT: "Insert",
  UPDATE: "Update",
  DELETE: "Delete",
}

// UPDATE usa el token --info (azul) via className: no hay variant "info" en
// el Badge compartido, así que se combina variant="outline" con clases que
// lo pisan en vez de agregar una variante de un solo uso al componente base.
export const OPERATION_TYPE_VARIANTS: Record<
  OperationType,
  "outline" | "secondary" | "default" | "destructive"
> = {
  INSERT: "default",
  UPDATE: "outline",
  DELETE: "destructive",
}

export const OPERATION_TYPE_CLASSNAMES: Record<OperationType, string> = {
  INSERT: "",
  UPDATE: "border-info/30 bg-info/10 text-info",
  DELETE: "",
}

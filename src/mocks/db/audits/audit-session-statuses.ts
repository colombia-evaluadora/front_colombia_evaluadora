import type { SessionStatusOption } from "@/features/audits/api/types/audit"

// Catálogo de estados de sesión de auditoría. Simula lo que en producción
// entrega el backend (`key` + `label`), de modo que el front no hardcodee
// las opciones del select ni sus etiquetas.
export const auditSessionStatusesDb: SessionStatusOption[] = [
  { key: "active", label: "Activo" },
  { key: "closed", label: "Cerrada" },
]
import type { OperationTypeOption } from "@/features/administration/audits/api/types/audit-table"

// Catálogo de tipos de operación de auditoría. Simula lo que en producción
// entrega el backend (`key` + `label`), de modo que el front no hardcodee
// las opciones del select ni sus etiquetas.
export const auditOperationTypesDb: OperationTypeOption[] = [
  { key: "INSERT", label: "Insert" },
  { key: "UPDATE", label: "Update" },
  { key: "DELETE", label: "Delete" },
]
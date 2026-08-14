import type { Campus } from "@/features/establishment/campuses/api/types/campus"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"

export type PermissionStatus = "ACTIVE" | "SUSPENDED"

export interface Permission {
  /**
   * `PK_TSEDE_USUARIO` real. Ausente mientras el permiso solo vive en el
   * borrador del front (agregado con "Agregar" y no persistido todavía) —
   * `dialog-manage.tsx` lo usa para distinguir, al guardar en real, cuáles
   * permisos son altas nuevas (sin `id`) y cuáles bajas de uno existente
   * (con `id`, ya no está en el borrador actual). Siempre ausente en mock.
   */
  id?: number

  order: number

  role: CatalogItem

  campus: Campus

  workSchedule: CatalogItem

  status: PermissionStatus
}
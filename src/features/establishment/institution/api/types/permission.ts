import type { Campus } from "@/features/establishment/campuses/api/types/campus"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"

export type PermissionStatus = "ACTIVE" | "SUSPENDED"

export interface Permission {
  order: number

  role: CatalogItem

  campus: Campus

  workSchedule: CatalogItem

  status: PermissionStatus
}
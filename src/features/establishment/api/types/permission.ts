import type { Campus } from "./campus"
import type { CatalogItem } from "./catalog"

export type PermissionStatus = "ACTIVE" | "SUSPENDED"

export interface Permission {
  order: number

  role: CatalogItem

  campus: Campus

  workSchedule: CatalogItem

  status: PermissionStatus
}
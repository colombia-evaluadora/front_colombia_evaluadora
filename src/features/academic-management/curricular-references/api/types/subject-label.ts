import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"

export interface SubjectLabelOption extends CatalogItem {
  isSeed: boolean
  inUse: boolean
}

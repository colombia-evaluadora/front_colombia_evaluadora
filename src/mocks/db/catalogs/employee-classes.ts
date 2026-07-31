import type { CatalogItem } from "@/features/establishment/api/types/catalog"

export const EMPLOYEE_CLASSES: CatalogItem[] = [
  { id: "plant", code: "PLANT", name: "Planta" },
  { id: "provisional", code: "PROVISIONAL", name: "Provisional" },
  { id: "contractor", code: "CONTRACTOR", name: "Contratista" },
  { id: "temporary", code: "TEMPORARY", name: "Temporal" },
]
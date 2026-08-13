import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"

export const EMPLOYMENT_TYPES: CatalogItem[] = [
  { id: "full-time", code: "FULL_TIME", name: "Tiempo completo" },
  { id: "part-time", code: "PART_TIME", name: "Medio tiempo" },
  { id: "hourly", code: "HOURLY", name: "Hora cátedra" },
  { id: "partial", code: "PARTIAL", name: "Tiempo parcial" },
]
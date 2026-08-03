import type { CatalogItem } from "@/features/establishment/api/types/catalog"

export const FUNDING_SOURCES: CatalogItem[] = [
  { id: "nation", code: "NATION", name: "Nación" },
  { id: "department", code: "DEPARTMENT", name: "Departamento" },
  { id: "municipality", code: "MUNICIPALITY", name: "Municipio" },
  { id: "own-resources", code: "OWN_RESOURCES", name: "Recursos propios" },
]
import type { CatalogItem } from "@/features/establishment/api/types/catalog";

export const DOCUMENT_TYPES: CatalogItem[] = [
  {
    id: "cc",
    code: "CC",
    name: "Cédula de ciudadanía",
  },
  {
    id: "ce",
    code: "CE",
    name: "Cédula de extranjería",
  },
  {
    id: "ti",
    code: "TI",
    name: "Tarjeta de identidad",
  },
  {
    id: "pa",
    code: "PA",
    name: "Pasaporte",
  },
]
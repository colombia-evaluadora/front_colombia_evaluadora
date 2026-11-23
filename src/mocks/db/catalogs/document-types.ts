import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog";

// Tipos de documento tal como los devuelve la base de datos, en su mismo orden.
// Ojo: "CC" aparece dos veces (la cédula y su versión 2), así que el `id` es lo
// único que distingue una de otra — no uses el `code` como llave.
export const DOCUMENT_TYPES: CatalogItem[] = [
  {
    id: 1,
    code: "CCa",
    name: "Certificado cabildo",
  },
  {
    id: 2,
    code: "CC",
    name: "Cédula de ciudadanía",
  },
  {
    id: 3,
    code: "CC",
    name: "Cédula de ciudadanía v2",
  },
  {
    id: 4,
    code: "CE",
    name: "Cédula de extranjería ó identificación de extranjería",
  },
  {
    id: 5,
    code: "NUIP",
    name: "Número único de identificación personal (NUIP)",
  },
  {
    id: 6,
    code: "NIP",
    name: "Número de identificación personal (NIP)",
  },
  {
    id: 7,
    code: "NES",
    name: "Número de identificación establecido por la Secretaría de Educación",
  },
  {
    id: 8,
    code: "RC",
    name: "Registro civil de nacimiento",
  },
  {
    id: 9,
    code: "TI",
    name: "Tarjeta de identidad",
  },
  {
    id: 10,
    code: "PPT",
    name: "Permiso por protección temporal",
  },
  {
    id: 11,
    code: "PEP",
    name: "Permiso especial de permanencia",
  },
]

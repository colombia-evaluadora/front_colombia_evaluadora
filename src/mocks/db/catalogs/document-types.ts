import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog";

// Tipos de documento tal como los devuelve la base de datos, en su mismo orden.
// Ojo: "CC" aparece dos veces (la cédula y su versión 2), así que el `id` es lo
// único que distingue una de otra — no uses el `code` como llave.
export const DOCUMENT_TYPES: CatalogItem[] = [
  {
    id: "cca",
    code: "CCa",
    name: "Certificado Cabildo",
  },
  {
    id: "cc",
    code: "CC",
    name: "Cédula de Ciudadanía",
  },
  {
    id: "cc-v2",
    code: "CC",
    name: "Cédula de Ciudadanía v2",
  },
  {
    id: "ce",
    code: "CE",
    name: "Cédula de Extranjería ó Identificación de Extranjería",
  },
  {
    id: "nuip",
    code: "NUIP",
    name: "Número Unico de Identificación Personal (NUIP)",
  },
  {
    id: "nip",
    code: "NIP",
    name: "Número de Identificación Personal (NIP)",
  },
  {
    id: "nes",
    code: "NES",
    name: "Número de Identificación establecido por la Secretaría de Educación",
  },
  {
    id: "rc",
    code: "RC",
    name: "Registro Civil de Nacimiento",
  },
  {
    id: "ti",
    code: "TI",
    name: "Tarjeta de Identidad",
  },
  {
    id: "ppt",
    code: "PPT",
    name: "Permiso por Protección temporal",
  },
  {
    id: "pep",
    code: "PEP",
    name: "Permiso Especial de Permanencia",
  },
]

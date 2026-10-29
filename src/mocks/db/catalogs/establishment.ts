import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"

export const CALENDARS: CatalogItem[] = [
  { id: 1, code: "A", name: "Calendario A" },
  { id: 2, code: "B", name: "Calendario B" },
]

export const SECTORES: CatalogItem[] = [
  { id: 95, code: "1", name: "Oficial" },
  { id: 96, code: "2", name: "No Oficial" },
]

export const MODALIDADES_PRESTACION: CatalogItem[] = [
  { id: 90, code: "PRESTACION_DIRECTA", name: "Prestación directa" },
  { id: 91, code: "ADMINISTRACION", name: "Administración del servicio educativo" },
  { id: 92, code: "GESTION", name: "Gestión del servicio educativo" },
  { id: 93, code: "PROVISION_CANASTA", name: "Provisión de la canasta educativa" },
  { id: 94, code: "IGLESIAS_CONFESIONES", name: "Iglesias y confesiones religiosas" },
]

export const RANGO_TARIFAS: CatalogItem[] = [
  { id: 3, code: "<0.6", name: "Menor de 0.6 SMLV" },
  { id: 4, code: "0.6-1", name: "Entre 0.6 y 1 SMLV" },
]

export const IDIOMAS: CatalogItem[] = [
  { id: 5, code: "ES", name: "Español" },
  { id: 6, code: "EN", name: "Inglés" },
  {id: 7, code: "BI", name: "Bilingüe"},
  { id: 8, code: "OTROS", name: "Otros" },
]

export const LEGAL_TYPES: (CatalogItem & { sector: string })[] = [
    { id: 9, code: "OFFICIAL", name: "Oficial", sector: "Oficial" },
    { id: 10, code: "PRIVATE", name: "Privado", sector: "No Oficial" },
]

export const ZONES: CatalogItem[] = [
    {id: 11, code: "URBANA", name: "Urbana"},
    {id: 12, code: "RURAL", name: "Rural"},
]

export const COST_REGIMEN: CatalogItem[] = [
    {id: 13, code: "LIBERTAD_VIGILADA", name: "Libertad Vigilada"},
    {id: 14, code: "OFERTA_PUBLICA", name: "Oferta Pública"},
]

export const DISABILITIES: CatalogItem[] = [
    {id: 15, code: "NA", name: "No aplica"},
    {id: 16, code: "VISUAL", name: "Visual"},
    {id: 17, code: "AUDITIVA", name: "Auditiva"},
    {id: 18, code: "COGNITIVA", name: "Cognitiva"},
    {id: 19, code: "FISICA", name: "Física"},
    {id: 20, code: "MULTIPLE", name: "Múltiple"},
]

export const LICENSE_STATUSES: CatalogItem[] = [
  {
    id: 21,
    code: "VALID",
    name: "Vigente",
  },
  {
    id: 22,
    code: "EXPIRED",
    name: "Vencida",
  },
  {
    id: 23,
    code: "PENDING",
    name: "En trámite",
  },
  {
    id: 24,
    code: "SUSPENDED",
    name: "Suspendida",
  },
]
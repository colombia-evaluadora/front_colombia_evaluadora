import type { CatalogItem } from "@/features/establishment/api/types/catalog"

export const CALENDARS: CatalogItem[] = [
  { id: "cal-a", code: "A", name: "Calendario A" },
  { id: "cal-b", code: "B", name: "Calendario B" },
]

export const RANGO_TARIFAS: CatalogItem[] = [
  { id: "menor-06", code: "<0.6", name: "Menor de 0.6 SMLV" },
  { id: "entre-06-1", code: "0.6-1", name: "Entre 0.6 y 1 SMLV" },
]

export const IDIOMAS: CatalogItem[] = [
  { id: "es", code: "ES", name: "Español" },
  { id: "en", code: "EN", name: "Inglés" },
  {id: "bi", code: "BI", name: "Bilingüe"},
  { id: "otros", code: "OTROS", name: "Otros" },
]

export const LEGAL_TYPES: CatalogItem[] = [
    { id: "oficial", code: "OFFICIAL", name: "Oficial" },
    { id: "privado", code: "PRIVATE", name: "Privado" },
]

export const ZONES: CatalogItem[] = [
    {id: "urbana", code: "URBANA", name: "Urbana"},
    {id: "rural", code: "RURAL", name: "Rural"},
]

export const COST_REGIMEN: CatalogItem[] = [
    {id: "libertad-vigilada", code: "LIBERTAD_VIGILADA", name: "Libertad Vigilada"},
    {id: "oferta-publica", code: "OFERTA_PUBLICA", name: "Oferta Pública"},
]

export const DISABILITIES: CatalogItem[] = [
    {id: "na", code: "NA", name: "No aplica"},
    {id: "visual", code: "VISUAL", name: "Visual"},
    {id: "auditiva", code: "AUDITIVA", name: "Auditiva"},
    {id: "cognitiva", code: "COGNITIVA", name: "Cognitiva"},
    {id: "fisica", code: "FISICA", name: "Física"},
    {id: "multiple", code: "MULTIPLE", name: "Múltiple"},
]

export const LICENSE_STATUSES: CatalogItem[] = [
  {
    id: "VALID",
    code: "VALID",
    name: "Vigente",
  },
  {
    id: "EXPIRED",
    code: "EXPIRED",
    name: "Vencida",
  },
  {
    id: "PENDING",
    code: "PENDING",
    name: "En trámite",
  },
  {
    id: "SUSPENDED",
    code: "SUSPENDED",
    name: "Suspendida",
  },
]
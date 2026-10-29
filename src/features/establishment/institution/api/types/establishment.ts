import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { Municipality } from "@/features/establishment/institution/api/types/location"
import type { Person } from "@/features/establishment/employees/api/types/person"

/** Fila del listado (`fn_est_listar`, sso V574): columnas del informe de diseño, 2. */
export interface Establishment {
  id: number
  dane: string
  name: string
  nit: string
  municipality: string
  department: string
  /** Oficial / No Oficial, derivado de la naturaleza jurídica. */
  sector: string
  /** Nombre completo del rector; vacío si el EE no tiene. */
  rector: string
}

export interface EstablishmentPopulation {
    /** Femenino, Masculino, Mixto o Sin estudiantes. */
    gender: string
    ethnicGroups: boolean
    exceptionalTalents: boolean
    subsidy: boolean
}

export interface EstablishmentDetails {
    /** Ausente hasta que el backend lo asigna (POST /establishments). */
    id?: number

    basicInfo: EstablishmentBasicInfo

    address: EstablishmentAddress

    contact: EstablishmentContact

    additionalInfo: EstablishmentAdditionalInfo

    principal: Person | null

    secretary: Person | null
}

export interface EstablishmentBasicInfo {

    name: string

    dane: string

    nit: string

    ownershipType: CatalogItem | null

    /**
     * Modalidad de prestación del servicio (`FK_TLV_MODALIDAD_PRESTACION`,
     * lista MODALIDAD_PRESTACION, sso V571.1). Obligatoria; los EE anteriores
     * la traen en `null` hasta que alguien los edite.
     */
    serviceModality: CatalogItem | null

    /**
     * `pk_tarchivo` del escudo ya cargado (`TESTABLECIMIENTO.FK_TARCHIVO`).
     * Solo de LECTURA: para verlo se pasa a `ArchivoImage`, que resuelve el
     * token de vista. Al guardar no viaja en el JSON — el escudo se manda como
     * el archivo `logo` del multipart y es `file-service` quien escribe esta
     * columna. Ausente en alta, y `null` si el EE no tiene escudo.
     */
    logoArchivoId?: number | null
}

export interface EstablishmentAddress {

    municipality: Municipality | null

    zone: CatalogItem | null

    district: CatalogItem | null

    commune: CatalogItem | null

    locality: CatalogItem | null

    address: string
}

export interface EstablishmentContact {

    email: string

    website: string

    phone: string

    fax?: string
}

export interface EstablishmentAdditionalInfo {

    approvalResolution: string

    teachingLanguage: CatalogItem | null

    calendar: CatalogItem | null

    costRegime: CatalogItem | null

    populationGender: CatalogItem | null

    tuitionRange: CatalogItem | null

    disabilityType: CatalogItem | null

    operatingLicense: boolean

    /** Texto libre (`LICENCIA_FUNCIONAMIENTO` es VARCHAR en la base, no un catálogo). */
    licenseStatus: string

    licenseDate: string | null

    ethnicAttention: boolean

    giftedAttention: boolean

    subsidy: boolean

    /**
     * Población atendida que calcula el sistema (`fn_est_poblacion_atendida`,
     * sso V571.2) con los estudiantes Cursando en periodos Abiertos. Solo de
     * lectura: no viaja al guardar. Ausente en el alta.
     */
    population?: EstablishmentPopulation | null
}

export interface EstablishmentsQueryFilters {
  /** Nombre, código DANE o NIT. */
  search?: string
  /** Códigos DANE de municipio. */
  municipality?: string[]
  /** `VALOR` de la lista SECTOR: 1 Oficial, 2 No Oficial. */
  sector?: string[]
}

export interface EstablishmentsQueryRequest {
  filters: EstablishmentsQueryFilters
  sorting: {
    id: string
    desc: boolean
  }[]
  pageIndex: number
  pageSize: number
}

export interface EstablishmentsQueryResponse {
  rows: Establishment[]
  pageCount: number
  totalCount: number
}

export type ExportFormat = "pdf" | "excel"

export interface ExportResult {
  status: "ok" | "error"
  message: string
}
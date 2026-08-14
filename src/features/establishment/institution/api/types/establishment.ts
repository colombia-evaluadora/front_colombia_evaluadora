import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { Municipality } from "@/features/establishment/institution/api/types/location"
import type { Person } from "@/features/establishment/employees/api/types/person"

export type EstablishmentStatus =
  | "ACTIVE"
  | "SUSPENDED"

export const ESTABLISHMENT_STATUSES: EstablishmentStatus[] = [
  "ACTIVE",
  "SUSPENDED",
]

export interface Establishment {
  id: number
  dane: string
  name: string
  department: string
  municipality: string
  status: EstablishmentStatus
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
}

export interface EstablishmentsQueryFilters {
  search?: string
  department?: string[]
  municipality?: string[]
  status?: EstablishmentStatus[]
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
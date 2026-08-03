import type { CatalogItem } from "./catalog"
import type { Municipality } from "./location"
import type { Person } from "./person"

export type EstablishmentStatus =
  | "ACTIVE"
  | "SUSPENDED"

export const ESTABLISHMENT_STATUSES: EstablishmentStatus[] = [
  "ACTIVE",
  "SUSPENDED",
]

export interface Establishment {
  id: string
  dane: string
  name: string
  department: string
  municipality: string
  status: EstablishmentStatus
}

export interface EstablishmentDetails {
    id: string

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

    ownershipType: CatalogItem
}

export interface EstablishmentAddress {

    municipality: Municipality

    zone: CatalogItem

    district: CatalogItem

    commune: CatalogItem

    locality: CatalogItem

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

    teachingLanguage: CatalogItem

    calendar: CatalogItem

    costRegime: CatalogItem

    populationGender: CatalogItem

    tuitionRange: CatalogItem

    disabilityType: CatalogItem

    operatingLicense: boolean

    licenseStatus: CatalogItem

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
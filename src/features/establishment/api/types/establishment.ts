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
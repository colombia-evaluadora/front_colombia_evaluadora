import type { CatalogItem } from "./catalog"

export interface Campus {
  id: string
  name: string
  dane: string
  zone: CatalogItem
  neighborhood: string
  commune: string
  address: string
  phone: string
  approvalResolution: string
}

export interface CampusesQueryFilters {
  search?: string
  zones?: string[]
}

export interface CampusesQueryRequest {
  filters: CampusesQueryFilters
  sorting: {
    id: string
    desc: boolean
  }[]
  pageIndex: number
  pageSize: number
}

export interface CampusesQueryResponse {
  rows: Campus[]
  pageCount: number
  totalCount: number
}
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"

export interface Campus {
  id: number
  name: string
  dane: string
  zone: CatalogItem | null
  neighborhood: string
  commune: string
  address: string
  phone: string
  approvalResolution: string
}

/**
 * Forma del formulario antes del primer guardado: sin `id`, lo asigna el
 * backend al crear (POST /establishments/campuses). Una `Campus` ya cargada
 * (edición) también encaja acá — trae `id` de más, que no molesta.
 */
export type CampusDraft = Omit<Campus, "id">

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
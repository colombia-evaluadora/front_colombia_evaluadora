import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"

export interface CurricularReference {
  id: number
  name: string
  educationLevels: CatalogItem[]
  description: string
  level1: string
  level2: string
  pedagogicalApproach: CatalogItem | null
  evaluationType: CatalogItem | null
  subjectLabel: CatalogItem | null
  areas: CatalogItem[]
  instrument: string
  instrumentDescription: string
  regulation: string
  active: boolean
  createdYear: number
  deactivatedYear: number | null
}

export type CurricularReferenceDraft = Omit<CurricularReference, "id" | "createdYear" | "deactivatedYear">

export interface CurricularReferencesQueryFilters {
  search?: string
  educationLevels?: string[]
  pedagogicalApproaches?: string[]
  evaluationTypes?: string[]
  active?: string
}

export interface CurricularReferencesQueryRequest {
  filters: CurricularReferencesQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

export interface CurricularReferencesQueryResponse {
  rows: CurricularReference[]
  pageCount: number
  totalCount: number
}

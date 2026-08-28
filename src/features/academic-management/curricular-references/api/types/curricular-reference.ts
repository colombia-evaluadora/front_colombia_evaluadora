import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"

export interface CurricularReference {
  id: number
  name: string
  educationLevels: CatalogItem[]
  description: string
  // "Estructura del referente": dos niveles de jerarquía propios del
  // referente (ej. Enunciado/Propósito y Evidencia/Imprescindible en DBA).
  level1: string
  level2: string
  pedagogicalApproach: CatalogItem | null
  evaluationType: CatalogItem | null
  // Opcional: a qué áreas o dimensiones del plan de estudio aplica.
  areas: CatalogItem[]
  instrument: string
  instrumentDescription: string
  regulation: string
  active: boolean
  // Historial de vigencia, todo a cargo del backend (no viaja en el draft):
  // año de alta y, si ya está inactivo y llegó a estar activo alguna vez,
  // año en que se desactivó. Un inactivo sin `deactivatedYear` es uno que
  // nació inactivo y nunca se activó.
  createdYear: number
  deactivatedYear: number | null
}

export type CurricularReferenceDraft = Omit<CurricularReference, "id" | "createdYear" | "deactivatedYear">

export interface CurricularReferencesQueryFilters {
  search?: string
  educationLevels?: string[]
  pedagogicalApproaches?: string[]
  evaluationTypes?: string[]
  /** "true" / "false" como texto — mismo criterio que el resto de filtros de catálogo. */
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

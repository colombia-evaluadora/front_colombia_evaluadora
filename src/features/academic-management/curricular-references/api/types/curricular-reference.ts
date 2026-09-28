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
  /** "Rótulo de Ejecución" — reemplaza en cascada la etiqueta "Actividad" en el Planeador. */
  executionLabel: string
  regulation: string
  active: boolean
  createdYear: number
  deactivatedYear: number | null
  /** Agregado de los Grados que cada componente de Nivel 1 declaró — de solo
   *  lectura, no se edita desde el Formulario de Configuración. `[]` = "Todos". */
  gradosVinculados: CatalogItem[]
}

export type CurricularReferenceDraft = Omit<
  CurricularReference,
  "id" | "createdYear" | "deactivatedYear" | "gradosVinculados"
>

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

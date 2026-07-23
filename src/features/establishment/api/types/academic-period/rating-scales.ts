export type RatingScaleType = "Fortaleza" | "Debilidad"

export interface TeachingLevel {
  id: number
  nombre: string
}

export interface RatingScale {
  codigo: number
  teachingLevelIds: number[]
  teachingLevels: TeachingLevel[]
  nombre: string
  abreviacion: string
  tipo: RatingScaleType
  iconografia: string
  notaMaxima: number
  notaMinima: number
  notaEquivalente: number
}

export interface RatingScalesQueryFilters {
  nombre?: string
  abreviacion?: string
  tipo?: RatingScaleType[]
}

export interface RatingScalesQueryRequest {
  filters: RatingScalesQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

export interface RatingScalesQueryResponse {
  rows: RatingScale[]
  pageCount: number
  totalCount: number
}

export type CreateRatingScaleRequest = RatingScale

export type UpdateRatingScaleRequest = RatingScale

export type ExportFormat = "pdf" | "excel"

export interface ExportResult {
  status: "ok" | "error"
  message: string
}

export interface RatingScalesExportRequest {
  ids?: number[]
  filters?: RatingScalesQueryFilters
  format: ExportFormat
}
export interface AreaSubject {
  codigo: number
  areaGeneral: string
  nombreInterno: string
  abreviacion: string
  ordenReportes: number
}

export interface AreaSubjectsQueryFilters {
  areaGeneral?: string
  nombreInterno?: string
  abreviacion?: string
}

export interface AreaSubjectsQueryRequest {
  filters: AreaSubjectsQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

export interface AreaSubjectsQueryResponse {
  rows: AreaSubject[]
  pageCount: number
  totalCount: number
}

export type CreateAreaSubjectRequest = AreaSubject

export type UpdateAreaSubjectRequest = AreaSubject

export interface MutationResult {
  status: "ok" | "error"
  message: string
}

export type ExportFormat = "pdf" | "excel"

export interface ExportResult {
  status: "ok" | "error"
  message: string
}

export interface AreaSubjectsExportRequest {
  ids?: number[]
  filters?: AreaSubjectsQueryFilters
  format: ExportFormat
}
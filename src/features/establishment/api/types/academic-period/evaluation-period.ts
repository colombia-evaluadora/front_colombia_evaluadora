export type EvaluationPeriodStatus = "Calificable" | "NO Calificable" | "Habilitados para algunas asignaturas" | "En Recuperaciones"

export interface EvaluationPeriod {
  codigo: number
  nombre: string
  abreviacion: string
  startDate: string
  endDate: string
  peso: number
  estado: EvaluationPeriodStatus
}

export interface EvaluationPeriodsQueryFilters {
  nombre?: string
  abreviacion?: string
  estado?: EvaluationPeriodStatus[]
}

export interface EvaluationPeriodsQueryRequest {
  filters: EvaluationPeriodsQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

export interface EvaluationPeriodsQueryResponse {
  rows: EvaluationPeriod[]
  pageCount: number
  totalCount: number
}

export type CreateEvaluationPeriodRequest = EvaluationPeriod

export type UpdateEvaluationPeriodRequest = EvaluationPeriod

export interface MutationResult {
  status: "ok" | "error"
  message: string
}

export type ExportFormat = "pdf" | "excel"

export interface ExportResult {
  status: "ok" | "error"
  message: string
}

export interface EvaluationPeriodsExportRequest {
  ids?: number[]
  filters?: EvaluationPeriodsQueryFilters
  format: ExportFormat
}
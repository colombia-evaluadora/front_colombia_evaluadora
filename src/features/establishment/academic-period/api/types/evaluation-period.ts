// VALOR de ESTADOPERIODOEVALUACION: 1 = Calificable, 2 = NO Calificable.
export type EvaluationPeriodStatus = "1" | "2"

export interface EvaluationPeriodStatusOption {
  id: number
  key: EvaluationPeriodStatus
  label: string
}

export interface EvaluationPeriod {
  id: number
  codigo: string
  nombre: string
  abreviacion: string
  startDate: string
  endDate: string
  peso: number
  estado: EvaluationPeriodStatus
  estadoId?: number
  estadoName?: string
}

export interface EvaluationPeriodsQueryFilters {
  filtro?: string
}

export interface EvaluationPeriodsQueryRequest {
  filters: EvaluationPeriodsQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
  academicPeriodId?: number
}

export interface EvaluationPeriodRecord extends EvaluationPeriod {
  academicPeriodId: number
}

export interface EvaluationPeriodsQueryResponse {
  rows: EvaluationPeriod[]
  pageCount: number
  totalCount: number
}

export interface CreateEvaluationPeriodRequest {
  FK_PERIODO: number
  CODIGO: string
  NOMBRE: string
  ABREVIACION: string
  FECHA_INICIO: string
  FECHA_FIN: string
  PORCENTAJE: number
}

export type UpdateEvaluationPeriodRequest = Omit<
  CreateEvaluationPeriodRequest,
  "FK_PERIODO"
>

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

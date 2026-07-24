export type AcademicPeriodStatus = "ACTIVO" | "INACTIVO"

export interface AcademicPeriod {
  id: number
  sedeId: number
  sedeName: string
  previousPeriodId: number | null
  schoolYearId: number
  status: AcademicPeriodStatus
  startDate: string
  endDate: string
  enrollmentDeadline: string
  minAbsences: number | null
  weeksCount: number | null
  minFailedSubjects: number | null
  name: string
  isPrincipal: boolean
}

export interface AcademicPeriodBreak {
  startTime: string
  endTime: string
}

export interface AcademicPeriodConfig {
  academicPeriodId: number
  jornadaId: number
  reservationEnabled: boolean
  defaultBlocksCount: number | null
  scheduleStartTime: string | null
  scheduleEndTime: string | null
  breaks: AcademicPeriodBreak[]
}

export interface AcademicPeriodsQueryFilters {
  sedeName?: string
  schoolYearId?: number
  status?: AcademicPeriodStatus[]
  // Rango sobre `startDate` (yyyy-MM-dd, inclusivo).
  startFrom?: string
  startTo?: string
}

export interface AcademicPeriodsQueryRequest {
  filters: AcademicPeriodsQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

export interface AcademicPeriodsQueryResponse {
  rows: AcademicPeriod[]
  pageCount: number
  totalCount: number
}

export type CreateAcademicPeriodRequest = Omit<
  AcademicPeriod,
  "id" | "sedeName"
> & {
  config: Omit<AcademicPeriodConfig, "academicPeriodId">
}

export interface MutationResult {
  status: "ok" | "error"
  message: string
}

export type ExportFormat = "pdf" | "excel"

export interface ExportResult {
  status: "ok" | "error"
  message: string
}

export interface AcademicPeriodsExportRequest {
  ids?: number[]
  filters?: AcademicPeriodsQueryFilters
  format: ExportFormat
}
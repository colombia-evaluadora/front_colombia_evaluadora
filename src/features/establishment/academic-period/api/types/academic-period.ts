
export type AcademicPeriodStatus = "A" | "C" | "I" | "P" | "N"

export interface AcademicPeriodStatusOption {
  id: number
  key: AcademicPeriodStatus
  label: string
}

export interface AcademicPeriod {
  id: number
  sedeId: string
  sedeName: string
  previousPeriodId: number | null
  previousPeriodName?: string | null
  schoolYearId: number
  status: AcademicPeriodStatus
  statusId?: number
  statusName?: string
  startDate: string
  endDate: string
  enrollmentDeadline: string
  minAbsences: number | null
  weeksCount: number | null
  minFailedSubjects: number | null
  name: string
  isPrincipal: boolean
  reservationEnabled: boolean
  defaultBlocksCount?: number | null
  scheduleStartTime?: string | null
  scheduleEndTime?: string | null
  breaks?: AcademicPeriodBreak[]
}

export interface AcademicPeriodBreak {
  startTime: string
  endTime: string
}

export interface PreviousPeriodOption {
  id: number
  name: string
}

export interface SchoolYearOption {
  id: number
  name: string
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
  statusId?: number[]
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

export interface CreateAcademicPeriodRequest {
  FK_SEDE: number
  FK_ESTADO: number
  FECHA_INICIO: string
  FECHA_FIN: string
  FECHA_LIMITE_MATRICULA: string
  FK_JORNADA: number
  HORA_INICIO: string | null
  HORA_FIN: string | null
  RESERVA: "S" | "N"
  BLOQUES_POR_DEFECTO: number | null
  FK_PERIODO_ANTERIOR: number | null
  DESCANSO_INICIO: string[]
  DESCANSO_FIN: string[]
}

export type UpdateAcademicPeriodRequest = CreateAcademicPeriodRequest

export interface AcademicPeriodDetail extends AcademicPeriod {
  config: AcademicPeriodConfig
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

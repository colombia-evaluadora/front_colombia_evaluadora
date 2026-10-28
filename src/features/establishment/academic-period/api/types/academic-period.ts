
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
  jornadaName?: string
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
  enrollmentModality?: EnrollmentModality
  cycle?: number
}

/** Receso de la jornada: aparece en el horario con su etiqueta (p. ej. "Recreo"). */
export interface AcademicPeriodBreak {
  label: string
  // "INICIO", "FINAL" o el número del bloque tras el que va (Regla 28).
  location: string
  durationMinutes: number | null
}

/** Modalidad de matrícula: cuántos ciclos tiene el año (Regla 14). */
export type EnrollmentModality = "ANUAL" | "SEMESTRAL" | "TRIMESTRAL" | "BIMESTRAL"

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
  enrollmentModality: EnrollmentModality
  cycle: number
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
  // Pendiente en el backend: modalidad y ciclo forman parte de la identidad del periodo.
  MODALIDAD_MATRICULA: EnrollmentModality
  CICLO: number
  // JSONB `[{label,location,afterBlock,durationMinutes}]`; `[]` borra todos los recesos.
  RECESOS: {
    label: string
    location: "INICIO" | "BLOQUE" | "FINAL"
    afterBlock: number | null
    durationMinutes: number
  }[]
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

export type AcademicPeriodStatus = "ACTIVO" | "INACTIVO"

// Opción de estado tal como la entrega el catálogo genérico de TLISTA_VALOR
// (`api/eval-col/select/:CATEGORIA` → `{pk_lista_valor, nombre, valor}`):
//   id  = pk_lista_valor (lo que se manda al backend como `p_fk_estado`)
//   key = valor          (código estable "ACTIVO"/"INACTIVO", para el color del badge)
//   label = nombre       (texto visible)
export interface AcademicPeriodStatusOption {
  id: number
  key: AcademicPeriodStatus
  label: string
}

export interface AcademicPeriod {
  id: number
  // String para coincidir con `Campus.id` del módulo de establecimientos;
  // antes era number pero los ids de sede ahora son strings (UUIDs/slugs).
  sedeId: string
  sedeName: string
  previousPeriodId: number | null
  schoolYearId: number
  // Código del estado (VALOR de TLISTA_VALOR) — se usa para el badge y el filtro.
  status: AcademicPeriodStatus
  // Id del estado (PK_LISTA_VALOR) — para preseleccionar al editar y para la
  // escritura (se manda como `statusId`).
  statusId?: number
  // Nombre del estado resuelto por el backend (TLISTA_VALOR.NOMBRE).
  statusName?: string
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
  // Filtro por id del estado (no código); el front ya tiene el catálogo.
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

// La escritura manda solo lo que `fn_periodo_crear` recibe. El estado va por id
// (`statusId` → `p_fk_estado`). El backend DERIVA `name` ("<año> - <jornada>") y
// `schoolYearId` (del año de `startDate`); `minAbsences`/`weeksCount`/
// `minFailedSubjects`/`isPrincipal` NO son parámetros de creación → no se mandan.
export type CreateAcademicPeriodRequest = Omit<
  AcademicPeriod,
  | "id"
  | "sedeName"
  | "status"
  | "statusId"
  | "name"
  | "schoolYearId"
  | "minAbsences"
  | "weeksCount"
  | "minFailedSubjects"
  | "isPrincipal"
> & {
  statusId: number
  config: Omit<AcademicPeriodConfig, "academicPeriodId">
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
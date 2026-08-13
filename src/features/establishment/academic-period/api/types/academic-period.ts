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

// Opción del select "Periodo académico anterior": el backend ya devuelve solo
// los candidatos válidos de la sede (activos, en alcance, excluyendo el que se
// edita), así que el front no filtra nada.
export interface PreviousPeriodOption {
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

// El body va PLANO con las llaves que espera `academico_test.fn_periodo_crear`
// (tokens `:BODY.*` del endpoint SSO); no lleva `config` anidado. El backend
// DERIVA `name` y `schoolYearId` (del año de `FECHA_INICIO`) y toma el usuario
// de `:CONTEXT.USER_ID`, así que esos no se mandan.
//   - `RESERVA` es `bool_sn` en la función → se manda "S"/"N", no boolean.
//   - `DESCANSO_INICIO`/`DESCANSO_FIN` son `TIME[]` PARALELOS (misma longitud y
//     orden). Siempre se envía el arreglo: `[]` = sin descansos / borrar todos.
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
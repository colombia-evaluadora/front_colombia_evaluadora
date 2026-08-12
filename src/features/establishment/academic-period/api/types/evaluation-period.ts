export type EvaluationPeriodStatus = "Calificable" | "NO Calificable" | "Habilitados para algunas asignaturas" | "En Recuperaciones"

// Opción de estado del catálogo genérico de TLISTA_VALOR
// (`api/eval-col/select/:CATEGORIA` → `{pk_lista_valor, nombre, valor}`):
//   id  = pk_lista_valor (se manda al backend como `p_fk_estado`)
//   key = valor          (código estable, para el color del badge)
//   label = nombre       (texto visible)
export interface EvaluationPeriodStatusOption {
  id: number
  key: EvaluationPeriodStatus
  label: string
}

export interface EvaluationPeriod {
  // PK real (PK_TPERIODO_EVALUACION) — identificador para rutas (PATCH/DELETE).
  id: number
  // Código de negocio que ingresa el usuario (único dentro del periodo).
  codigo: number
  nombre: string
  abreviacion: string
  startDate: string
  endDate: string
  peso: number
  // Código del estado (VALOR de TLISTA_VALOR) — para el badge y el filtro.
  estado: EvaluationPeriodStatus
  // Id del estado (PK_LISTA_VALOR) — para preseleccionar al editar y para la escritura.
  estadoId?: number
  // Nombre del estado resuelto por el backend (TLISTA_VALOR.NOMBRE).
  estadoName?: string
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

// La escritura manda el estado por id (`estadoId` → `p_fk_estado`), no el código.
// El PK (`id`) lo asigna el backend al crear → se omite en el request.
export type CreateEvaluationPeriodRequest = Omit<
  EvaluationPeriod,
  "id" | "estado" | "estadoId" | "estadoName"
> & {
  estadoId: number
  academicPeriodId?: number
}

export type UpdateEvaluationPeriodRequest = CreateEvaluationPeriodRequest

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
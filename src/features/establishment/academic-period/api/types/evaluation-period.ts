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
  // `fn_periodo_eval_listar` expone un solo `p_filtro` de texto libre (no hay
  // filtros separados por nombre/abreviación/estado del lado del backend);
  // ver [[shaping-front-vs-backend]] — el front decide qué manda acá.
  filtro?: string
}

export interface EvaluationPeriodsQueryRequest {
  filters: EvaluationPeriodsQueryFilters
  // `fn_periodo_eval_listar` todavía no recibe orden en el signature que
  // probamos por Thunder Client, pero se va a agregar (mismo patrón
  // SORT_BY/SORT_DIR que `fn_periodo_listar`) — se deja wireado desde ya.
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

// Body PLANO (UPPER_SNAKE) que espera `POST /periodo-evaluacion`
// (`fn_periodo_eval_crear`). El usuario sale de `:CONTEXT.USER_ID` → no se manda.
export interface CreateEvaluationPeriodRequest {
  FK_PERIODO: number
  CODIGO: number
  NOMBRE: string
  ABREVIACION: string
  FECHA_INICIO: string
  FECHA_FIN: string
  FK_ESTADO: number
  PORCENTAJE: number
}

// `fn_periodo_eval_actualizar` no recibe `fk_periodo` (no se reasigna el
// periodo académico al editar) ni `id` (va en el path, `PUT
// /periodo-evaluacion/editar/:ID`).
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
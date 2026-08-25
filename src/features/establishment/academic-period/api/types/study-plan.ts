export interface StudyPlanItem {
  codigo: number
  asignaturaId: number
  // Etiqueta para mostrar (incluye el énfasis cuando la asignatura lo tiene,
  // ver toStudyPlanItem en use-study-plans.ts) — no es identidad, solo display.
  asignatura: string
  intensidadHoraria: number
  influenciaArea: number
  numeroCreditos: number
  influyeDesempeno: boolean
  matriculaObligatoria?: boolean
  aprobacionObligatoria?: boolean
  formatoCalificacion?: string
  criterioNota?: string
  personalizado?: boolean
}

// Asignatura del periodo del grado que aún NO está en su plan de estudio
// (backend: `fn_plan_asignaturas_disponibles_listar` → `[{id, nombre, area_id,
// area_nombre, enfasis_nombre}]`). Selección por `id` — el nombre puede
// repetirse entre asignaturas de distinto énfasis, así que `label` incluye el
// énfasis para diferenciarlas en el combobox.
export interface AvailableStudyPlanSubject {
  id: number
  label: string
  areaId?: number
  areaNombre: string
}

export interface StudyPlanQueryFilters {
  asignatura?: string
}

export interface StudyPlanQueryRequest {
  filters: StudyPlanQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
  academicPeriodId?: number
  gradeId?: number
}

export interface StudyPlanQueryResponse {
  rows: StudyPlanItem[]
  pageCount: number
  totalCount: number
}

export interface StudyPlanRecord extends StudyPlanItem {
  academicPeriodId: number
  gradeId: number
}

// Los requests de guardado se derivan del form (`StudyPlanFormValues`, ver
// schema.ts), no de `StudyPlanItem`: el form solo conoce `asignaturaId`, la
// etiqueta `asignatura` es un campo de solo lectura que llega del listado.
export type CreateStudyPlanItemRequest = Omit<StudyPlanItem, "codigo" | "asignatura"> & {
  academicPeriodId?: number
  gradeId?: number
}

export type UpdateStudyPlanItemRequest = Omit<StudyPlanItem, "asignatura">

export interface MutationResult {
  status: "ok" | "error"
  message: string
}

export type ExportFormat = "pdf" | "excel"

export interface ExportResult {
  status: "ok" | "error"
  message: string
}

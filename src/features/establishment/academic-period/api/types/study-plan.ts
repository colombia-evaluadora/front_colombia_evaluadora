export interface StudyPlanItem {
  codigo: number
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
// area_nombre}]`). El front hoy referencia la asignatura por nombre; `id`/`areaId`
// quedan disponibles para cuando el guardado migre a id.
export interface AvailableStudyPlanSubject {
  id: number
  nombre: string
  areaId?: number
  areaNombre: string
}

export interface StudyPlanQueryFilters {
  asignatura?: string
}

// Filtros del reporte "Plan de estudio" (cruza TODOS los grados del periodo,
// a diferencia de la pestaña de edición que está scopeada a un solo grado).
export interface StudyPlanReportFilters {
  academicPeriodId?: number
  gradeIds?: number[]
  subjectIds?: number[]
  specialtyIds?: number[]
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

export type CreateStudyPlanItemRequest = Omit<StudyPlanItem, "codigo"> & {
  academicPeriodId?: number
  gradeId?: number
}

export type UpdateStudyPlanItemRequest = StudyPlanItem

export interface MutationResult {
  status: "ok" | "error"
  message: string
}

export type ExportFormat = "pdf" | "excel"

export interface ExportResult {
  status: "ok" | "error"
  message: string
}

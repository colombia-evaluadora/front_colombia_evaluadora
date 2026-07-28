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

export type CreateStudyPlanItemRequest = StudyPlanItem & {
  academicPeriodId?: number
  gradeId?: number
}

export type UpdateStudyPlanItemRequest = StudyPlanItem

export interface MutationResult {
  status: "ok" | "error"
  message: string
}

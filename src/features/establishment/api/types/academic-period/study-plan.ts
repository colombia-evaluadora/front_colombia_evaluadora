export interface StudyPlanItem {
  codigo: number
  asignatura: string
  intensidadHoraria: number
  // Influencia del área, en porcentaje (0-100).
  influenciaArea: number
  numeroCreditos: number
  // Influye en el desempeño académico (S/N).
  influyeDesempeno: boolean
  // Campos personalizados (opcionales) del plan de estudio.
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
}

export interface StudyPlanQueryResponse {
  rows: StudyPlanItem[]
  pageCount: number
  totalCount: number
}

export type CreateStudyPlanItemRequest = StudyPlanItem

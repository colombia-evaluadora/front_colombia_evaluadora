export interface AreaSubjectItem {
  // PK real de la asignatura (`SubjectRecord.id`); ausente en asignaturas que
  // todavía no se guardaron. Se usa internamente para diferenciar
  // alta/edición/baja contra el endpoint real al guardar — no lo consume la UI.
  id?: number
  asignaturaGeneral: string
  nombreInterno: string
  abreviacion: string
  ordenReportes: number
  color?: string
  especialidad?: string
}

export interface AreaSubject {
  codigo: number
  areaGeneral: string
  nombreInterno: string
  abreviacion: string
  ordenReportes: number
  subjects: AreaSubjectItem[]
}

export interface AreaSubjectsQueryFilters {
  areaGeneral?: string
  nombreInterno?: string
  abreviacion?: string
}

export interface AreaSubjectsQueryRequest {
  filters: AreaSubjectsQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
  academicPeriodId?: number
}

export interface AreaSubjectRecord extends AreaSubject {
  academicPeriodId: number
}

export interface AreaSubjectsQueryResponse {
  rows: AreaSubject[]
  pageCount: number
  totalCount: number
}

export type CreateAreaSubjectRequest = Omit<AreaSubject, "codigo"> & {
  academicPeriodId?: number
}

export type UpdateAreaSubjectRequest = AreaSubject

export interface MutationResult {
  status: "ok" | "error"
  message: string
}

export type ExportFormat = "pdf" | "excel"

export interface ExportResult {
  status: "ok" | "error"
  message: string
}

export interface AreaSubjectsExportRequest {
  ids?: number[]
  filters?: AreaSubjectsQueryFilters
  format: ExportFormat
}

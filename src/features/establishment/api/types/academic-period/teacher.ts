export type TeacherStatus = "ACTIVO" | "INACTIVO"

export interface Teacher {
  documento: string
  apellido: string
  nombre: string
  estado: TeacherStatus
}

export interface TeachersQueryFilters {
  documento?: string
  apellido?: string
  nombre?: string
  estado?: TeacherStatus[]
}

export interface TeachersQueryRequest {
  filters: TeachersQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
  academicPeriodId?: number
}

// Los docentes pertenecen a una sede (no a un periodo): cualquier periodo de
// esa sede debe poder verlos, incluido uno recién creado.
export interface TeacherRecord extends Teacher {
  sedeId: number
}

export interface TeachersQueryResponse {
  rows: Teacher[]
  pageCount: number
  totalCount: number
}

export type ExportFormat = "pdf" | "excel"

export interface ExportResult {
  status: "ok" | "error"
  message: string
}

export interface TeachersExportRequest {
  filters?: TeachersQueryFilters
  format: ExportFormat
}

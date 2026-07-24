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
}

export interface TeachersQueryResponse {
  rows: Teacher[]
  pageCount: number
  totalCount: number
}

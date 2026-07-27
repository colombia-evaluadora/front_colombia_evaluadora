export interface Grade {
  id: number
  nombre: string
  grado: string
  teachingLevelId: number
  teachingLevelName: string
  gradoSiguiente?: string
  tieneGradoSiguiente?: boolean
}

export interface GradesQueryFilters {
  nombre?: string
  grado?: string
  teachingLevelIds?: number[]
}

export interface GradesQueryRequest {
  filters: GradesQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
  academicPeriodId?: number
}

export interface GradeRecord extends Grade {
  academicPeriodId: number
}

export interface GradesQueryResponse {
  rows: Grade[]
  pageCount: number
  totalCount: number
}

export type CreateGradeRequest = Omit<Grade, "id" | "teachingLevelName"> & {
  academicPeriodId?: number
}

export type UpdateGradeRequest = Partial<
  Omit<Grade, "id" | "teachingLevelName">
>

export interface MutationResult {
  status: "ok" | "error"
  message: string
}

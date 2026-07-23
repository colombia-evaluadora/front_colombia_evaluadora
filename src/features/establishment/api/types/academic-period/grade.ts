export interface Grade {
  id: number
  nombre: string
  grado: string
  teachingLevelId: number
  teachingLevelName: string
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
}

export interface GradesQueryResponse {
  rows: Grade[]
  pageCount: number
  totalCount: number
}

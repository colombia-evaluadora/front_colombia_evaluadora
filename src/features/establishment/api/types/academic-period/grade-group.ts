export interface GradeGroup {
  codigo: string
  jornada: string
  director: string
  planEstudio: string
  metodologia?: string
  cupo?: number
}

export interface GradeGroupsQueryFilters {
  codigo?: string
  jornada?: string
  director?: string
  planEstudio?: string
}

export interface GradeGroupsQueryRequest {
  filters: GradeGroupsQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
  gradeId?: number
}

export interface GradeGroupsQueryResponse {
  rows: GradeGroup[]
  pageCount: number
  totalCount: number
}

export interface GradeGroupRecord extends GradeGroup {
  gradeId: number
}

export type CreateGradeGroupRequest = GradeGroup & {
  gradeId?: number
}

export interface MutationResult {
  status: "ok" | "error"
  message: string
}

export interface GradeGroup {
  /** PK_TGRUPO — identificador real del grupo (necesario para el horario). */
  id: number
  codigo: string
  jornada: string
  // Nombre de la jornada resuelto por el backend (TLISTA_VALOR.NOMBRE);
  // adicional al valor `jornada`.
  jornadaName?: string
  director: string
  metodologia?: string
  // Nombre de la metodología resuelto por el backend (TLISTA_VALOR.NOMBRE);
  // adicional al valor `metodologia`.
  metodologiaName?: string
  cupo?: number
}

export interface GradeGroupsQueryFilters {
  codigo?: string
  jornada?: string
  director?: string
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

export type CreateGradeGroupRequest = Omit<GradeGroup, "id"> & {
  gradeId?: number
  // Necesario para resolver `director` (nombre) a `FK_TFUNCIONARIO` contra
  // `GET /eval-col/sedes/:ID/funcionarios` — ver resolve-director-id.ts.
  sedeId?: string
}

export type UpdateGradeGroupRequest = Omit<GradeGroup, "id">

export interface MutationResult {
  status: "ok" | "error"
  message: string
}

export type ExportFormat = "pdf" | "excel"

export interface ExportResult {
  status: "ok" | "error"
  message: string
}

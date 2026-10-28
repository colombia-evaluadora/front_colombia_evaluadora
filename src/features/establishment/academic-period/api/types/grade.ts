import type { AcademicPeriodBreak } from "@/features/establishment/academic-period/api/types/academic-period"

export interface Grade {
  id: number
  nombre: string
  grado: string
  teachingLevelId: number
  teachingLevelName: string
  gradoSiguiente?: string
  // Nombre del grado siguiente resuelto por el backend (TLISTA_VALOR.NOMBRE);
  // adicional al valor `gradoSiguiente`.
  gradoSiguienteName?: string
  tieneGradoSiguiente?: boolean
  // Jornadas en que el estudiante puede seguir en el grado siguiente (Regla 88).
  jornadasContinuidad?: { id: number; name: string }[]
  // Horario propio del grado (Regla 87); con false usa el de la jornada.
  personalizarHorario?: boolean
  horaInicio?: string | null
  horaFin?: string | null
  bloques?: number | null
  recesos?: AcademicPeriodBreak[]
  // Los calcula el sistema con los grupos del grado.
  gruposCount?: number
  cupoTotal?: number
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

export type UpdateGradeRequest = Partial<Omit<Grade, "id" | "teachingLevelName">>

export interface MutationResult {
  status: "ok" | "error"
  message: string
}

export type ExportFormat = "pdf" | "excel"

export interface ExportResult {
  status: "ok" | "error"
  message: string
}

export interface GradesExportRequest {
  ids?: number[]
  filters?: GradesQueryFilters
  format: ExportFormat
}

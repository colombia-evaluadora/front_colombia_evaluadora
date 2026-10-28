export interface AssignmentSubject {
  id: string
  nombre: string
  gradoGrupo: string
  jornada: string
  jornadaName?: string
  funcionarioId?: string
  bloqueadoPreescolar?: boolean
}

export interface TeacherAssignments {
  available: AssignmentSubject[]
  assigned: AssignmentSubject[]
}

export interface SaveTeacherAssignmentsRequest {
  academicPeriodId: number
  funcionarioId: string
  subjectIds: string[]
}

export interface MutationResult {
  status: "ok" | "error"
  message: string
}

// Asignación académica (Sección 5.4): un Responsable de enseñanza dicta una
// [Área] en un grupo. Una por grupo (Regla 69).
export type AcademicAssignmentStatus = "A" | "I"

export interface AcademicAssignment {
  id: number
  funcionarioId: string
  docente: string
  gradeId: number
  grado: string
  groupId: number
  grupo: string
  subjectId: number
  asignatura: string
  status: AcademicAssignmentStatus
  // Regla 108: la crea el sistema para el Responsable de grupo; solo lectura.
  automatica: boolean
}

export interface AcademicAssignmentFilters {
  search: string
  funcionarioId: string
  gradeId: number | ""
  subjectId: number | ""
  status: AcademicAssignmentStatus | ""
}

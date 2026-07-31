export interface AssignmentSubject {
  id: string
  nombre: string
  gradoGrupo: string
  jornada: string
}

export interface TeacherAssignments {
  available: AssignmentSubject[]
  assigned: AssignmentSubject[]
}

export interface SaveTeacherAssignmentsRequest {
  academicPeriodId: number
  documentNumber: string
  subjectIds: string[]
}

export interface MutationResult {
  status: "ok" | "error"
  message: string
}

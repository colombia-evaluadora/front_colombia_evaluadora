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

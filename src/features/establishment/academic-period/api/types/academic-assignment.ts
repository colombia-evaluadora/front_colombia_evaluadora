export interface AssignmentSubject {
  id: string
  nombre: string
  gradoGrupo: string
  jornada: string
  // Nombre completo de la jornada resuelto por el backend (TLISTA_VALOR.NOMBRE);
  // `jornada` es solo la abreviación (inicial) para la ficha.
  jornadaName?: string
}

export interface TeacherAssignments {
  available: AssignmentSubject[]
  assigned: AssignmentSubject[]
}

export interface SaveTeacherAssignmentsRequest {
  academicPeriodId: number
  // Id del funcionario (PK_TFUNCIONARIO). El backend identifica al docente por
  // id, no por documento.
  funcionarioId: string
  subjectIds: string[]
}

export interface MutationResult {
  status: "ok" | "error"
  message: string
}

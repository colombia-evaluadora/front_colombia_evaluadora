export interface AssignmentSubject {
  id: string
  nombre: string
  gradoGrupo: string
  jornada: string
  // Nombre completo de la jornada resuelto por el backend (TLISTA_VALOR.NOMBRE);
  // `jornada` es solo la abreviación (inicial) para la ficha.
  jornadaName?: string
  // Funcionario (PK_TFUNCIONARIO) que ya tiene asignado este grupo-asignatura
  // en el periodo, si hay alguno. `undefined` = nadie la tiene. Sirve para
  // distinguir "disponible para cualquiera" de "ya asignada a otro docente"
  // sin ocultar del pool las asignaturas del propio docente que se está
  // editando (que sí deben poder mostrarse en "Asignaturas actuales").
  funcionarioId?: string
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

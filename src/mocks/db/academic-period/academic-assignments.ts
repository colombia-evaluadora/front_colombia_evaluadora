import type { AcademicAssignmentStatus } from "@/features/establishment/academic-period/api/types/academic-assignment"

// Asignaciones registradas a mano (Sección 5.4). Las automáticas del
// Responsable de grupo (Regla 108) no se guardan: las arma el handler.
export interface AcademicAssignmentRecord {
  id: number
  periodId: number
  funcionarioId: string
  groupId: number
  subjectId: number
  status: AcademicAssignmentStatus
}

// Se siembra en la primera lectura del período, con los docentes de su sede.
export const academicAssignmentsDb: AcademicAssignmentRecord[] = []
export const seededPeriods = new Set<number>()

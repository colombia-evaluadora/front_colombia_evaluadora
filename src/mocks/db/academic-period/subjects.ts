// Asignatura real (V40): recurso separado del área, con su propio PK.
export interface SubjectRecord {
  id: number
  nombreInterno: string
  abreviacion: string
  asignaturaGeneralId: number
  enfasisId: number | null
  color: string | null
  ordenReportes: number
  areaId: number
}

export const subjectsDb: SubjectRecord[] = []

// El backend asigna el id al crear; el front no debe generarlo.
export function nextSubjectId(): number {
  return subjectsDb.reduce((max, row) => Math.max(max, row.id), 0) + 1
}

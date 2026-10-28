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

function seed(id: number, areaId: number, nombreInterno: string, abreviacion: string, generalId: number): SubjectRecord {
  return { id, nombreInterno, abreviacion, asignaturaGeneralId: generalId, enfasisId: null, color: null, ordenReportes: id, areaId }
}

// Asignaturas de las áreas sembradas del período 1.
export const subjectsDb: SubjectRecord[] = [
  seed(1, 1, "Matemáticas", "MAT", 15),
  seed(2, 2, "Lengua Castellana", "LEN", 12),
  seed(3, 2, "Inglés", "ING", 14),
  seed(4, 3, "Biología", "BIO", 3),
  seed(5, 3, "Química", "QUI", 17),
  seed(6, 4, "Ciencias Sociales", "SOC", 4),
]

// El backend asigna el id al crear; el front no debe generarlo.
export function nextSubjectId(): number {
  return subjectsDb.reduce((max, row) => Math.max(max, row.id), 0) + 1
}

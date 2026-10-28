// Área real (V40): recurso separado de la asignatura, con su propio PK.
export interface AreaRecord {
  id: number
  codigo: string
  nombreInterno: string
  areaGeneralId: number
  ordenReportes: number
  academicPeriodId: number
}

// Áreas del período 1 para probar los selectores que dependen del catálogo
// del período (p. ej. obligatorias de Criterios de promoción).
export const areasDb: AreaRecord[] = [
  { id: 1, codigo: "MAT", nombreInterno: "Matemáticas", areaGeneralId: 15, ordenReportes: 1, academicPeriodId: 1 },
  { id: 2, codigo: "HUM", nombreInterno: "Humanidades y Lengua Castellana", areaGeneralId: 12, ordenReportes: 2, academicPeriodId: 1 },
  { id: 3, codigo: "CNA", nombreInterno: "Ciencias Naturales y Educación Ambiental", areaGeneralId: 3, ordenReportes: 3, academicPeriodId: 1 },
  { id: 4, codigo: "CSO", nombreInterno: "Ciencias Sociales", areaGeneralId: 4, ordenReportes: 4, academicPeriodId: 1 },
]

// El backend asigna el id al crear; el front no debe generarlo.
export function nextAreaId(): number {
  return areasDb.reduce((max, row) => Math.max(max, row.id), 0) + 1
}

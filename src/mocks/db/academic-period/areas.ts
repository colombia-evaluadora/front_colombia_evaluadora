// Área real (V40): recurso separado de la asignatura, con su propio PK.
export interface AreaRecord {
  id: number
  codigo: string
  nombreInterno: string
  areaGeneralId: number
  ordenReportes: number
  academicPeriodId: number
}

export const areasDb: AreaRecord[] = []

// El backend asigna el id al crear; el front no debe generarlo.
export function nextAreaId(): number {
  return areasDb.reduce((max, row) => Math.max(max, row.id), 0) + 1
}

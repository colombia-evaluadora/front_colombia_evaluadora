import type { AreaSubjectRecord } from "@/features/establishment/academic-period/api/types/area-subject"

export const areaSubjectsDb: AreaSubjectRecord[] = []

// El backend asigna el código al crear; el front no debe generarlo.
export function nextAreaSubjectId(): number {
  return areaSubjectsDb.reduce((max, row) => Math.max(max, row.codigo), 0) + 1
}

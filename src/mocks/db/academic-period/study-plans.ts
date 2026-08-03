import type { StudyPlanRecord } from "@/features/establishment/academic-period/api/types/study-plan"

export const studyPlansDb: StudyPlanRecord[] = []

// El backend asigna el código al crear; el front no debe generarlo.
export function nextStudyPlanId(): number {
  return studyPlansDb.reduce((max, row) => Math.max(max, row.codigo), 0) + 1
}

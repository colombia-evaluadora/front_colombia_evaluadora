import type { GradeRecord } from "@/features/establishment/academic-period/api/types/grade"
import { teachingLevelsDb } from "./rating-scales"

export function gradeLevelName(id: number): string {
  return teachingLevelsDb.find((level) => level.id === id)?.nombre ?? ""
}

export const gradesDb: GradeRecord[] = []

import type { GradeRecord } from "@/features/establishment/academic-period/api/types/grade"
import { teachingLevelsDb } from "./rating-scales"

export function gradeLevelName(id: number): string {
  return teachingLevelsDb.find((level) => level.id === id)?.nombre ?? ""
}

let nextId = 1

function createGrade(
  data: Omit<GradeRecord, "id" | "teachingLevelName">
): GradeRecord {
  return {
    id: nextId++,
    ...data,
    teachingLevelName: gradeLevelName(data.teachingLevelId),
  }
}

export const gradesDb: GradeRecord[] = [
  createGrade({ academicPeriodId: 1, nombre: "Transición", grado: "0°", teachingLevelId: 1 }),
  createGrade({ academicPeriodId: 1, nombre: "Primero", grado: "1°", teachingLevelId: 2 }),
  createGrade({ academicPeriodId: 1, nombre: "Segundo", grado: "2°", teachingLevelId: 2 }),
  createGrade({ academicPeriodId: 1, nombre: "Tercero", grado: "3°", teachingLevelId: 2 }),
  createGrade({ academicPeriodId: 1, nombre: "Cuarto", grado: "4°", teachingLevelId: 2 }),
  createGrade({ academicPeriodId: 1, nombre: "Quinto", grado: "5°", teachingLevelId: 2 }),
  createGrade({ academicPeriodId: 2, nombre: "Sexto", grado: "6°", teachingLevelId: 3 }),
  createGrade({ academicPeriodId: 2, nombre: "Séptimo", grado: "7°", teachingLevelId: 3 }),
  createGrade({ academicPeriodId: 2, nombre: "Octavo", grado: "8°", teachingLevelId: 3 }),
  createGrade({ academicPeriodId: 2, nombre: "Noveno", grado: "9°", teachingLevelId: 3 }),
  createGrade({ academicPeriodId: 3, nombre: "Décimo", grado: "10°", teachingLevelId: 4 }),
  createGrade({ academicPeriodId: 3, nombre: "Undécimo", grado: "11°", teachingLevelId: 4 }),
]

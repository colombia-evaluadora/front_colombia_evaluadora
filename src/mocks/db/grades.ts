import type { Grade } from "@/features/establishment/api/types/academic-period/grade"
import { teachingLevelsDb } from "./rating-scales"

function levelName(id: number): string {
  return teachingLevelsDb.find((level) => level.id === id)?.nombre ?? ""
}

let nextId = 1

function createGrade(
  data: Omit<Grade, "id" | "teachingLevelName">
): Grade {
  return {
    id: nextId++,
    ...data,
    teachingLevelName: levelName(data.teachingLevelId),
  }
}

export const gradesDb: Grade[] = [
  createGrade({ nombre: "Transición", grado: "0°", teachingLevelId: 1 }),
  createGrade({ nombre: "Primero", grado: "1°", teachingLevelId: 2 }),
  createGrade({ nombre: "Segundo", grado: "2°", teachingLevelId: 2 }),
  createGrade({ nombre: "Tercero", grado: "3°", teachingLevelId: 2 }),
  createGrade({ nombre: "Cuarto", grado: "4°", teachingLevelId: 2 }),
  createGrade({ nombre: "Quinto", grado: "5°", teachingLevelId: 2 }),
  createGrade({ nombre: "Sexto", grado: "6°", teachingLevelId: 3 }),
  createGrade({ nombre: "Séptimo", grado: "7°", teachingLevelId: 3 }),
  createGrade({ nombre: "Octavo", grado: "8°", teachingLevelId: 3 }),
  createGrade({ nombre: "Noveno", grado: "9°", teachingLevelId: 3 }),
  createGrade({ nombre: "Décimo", grado: "10°", teachingLevelId: 4 }),
  createGrade({ nombre: "Undécimo", grado: "11°", teachingLevelId: 4 }),
]

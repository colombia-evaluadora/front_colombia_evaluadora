import type {
  RatingScaleRecord,
  TeachingLevel,
} from "@/features/establishment/academic-period/api/types/rating-scales"

export const teachingLevelsDb: TeachingLevel[] = [
  { id: 1, nombre: "Preescolar", grados: ["Prejardín", "Jardín", "Transición"] },
  {
    id: 2,
    nombre: "Básica primaria",
    grados: ["Primero", "Segundo", "Tercero", "Cuarto", "Quinto"],
  },
  {
    id: 3,
    nombre: "Secundaria",
    grados: ["Sexto", "Séptimo", "Octavo", "Noveno"],
  },
  { id: 4, nombre: "Educación media", grados: ["Décimo", "Undécimo"] },
  { id: 5, nombre: "Educación superior", grados: [] },
]

export function resolveTeachingLevels(ids: number[]): TeachingLevel[] {
  return teachingLevelsDb.filter((level) => ids.includes(level.id))
}

export const ratingScalesDb: RatingScaleRecord[] = []

export function nextRatingScaleId(): number {
  return ratingScalesDb.reduce((max, row) => Math.max(max, row.codigo), 0) + 1
}

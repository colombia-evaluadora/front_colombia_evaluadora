import type {
  RatingScale,
  TeachingLevel,
} from "@/features/establishment/api/types/academic-period/rating-scales"

export const teachingLevelsDb: TeachingLevel[] = [
  { id: 1, nombre: "Preescolar" },
  { id: 2, nombre: "Básica primaria" },
  { id: 3, nombre: "Secundaria" },
  { id: 4, nombre: "Educación media" },
  { id: 5, nombre: "Educación superior" },
]

export function resolveTeachingLevels(ids: number[]): TeachingLevel[] {
  return teachingLevelsDb.filter((level) => ids.includes(level.id))
}

let nextId = 1

function createScale(
  data: Omit<RatingScale, "codigo" | "teachingLevels">
): RatingScale {
  return {
    codigo: nextId++,
    ...data,
    teachingLevels: resolveTeachingLevels(data.teachingLevelIds),
  }
}

export const ratingScalesDb: RatingScale[] = [
  createScale({
    teachingLevelIds: [1, 2, 3],
    nombre: "Desempeño bajo",
    abreviacion: "DES. BAJO",
    tipo: "Debilidad",
    iconografia: "😢",
    notaMaxima: 2.9,
    notaMinima: 0,
    notaEquivalente: 1,
  }),
  createScale({
    teachingLevelIds: [1, 2, 3],
    nombre: "Desempeño básico",
    abreviacion: "DES. BÁSICO",
    tipo: "Fortaleza",
    iconografia: "🙂",
    notaMaxima: 3.9,
    notaMinima: 3.0,
    notaEquivalente: 3,
  }),
  createScale({
    teachingLevelIds: [3, 4],
    nombre: "Desempeño alto",
    abreviacion: "DES. ALTO",
    tipo: "Fortaleza",
    iconografia: "😄",
    notaMaxima: 4.5,
    notaMinima: 4.0,
    notaEquivalente: 4,
  }),
  createScale({
    teachingLevelIds: [4, 5],
    nombre: "Desempeño superior",
    abreviacion: "DES. SUP.",
    tipo: "Fortaleza",
    iconografia: "🏆",
    notaMaxima: 5.0,
    notaMinima: 4.6,
    notaEquivalente: 5,
  }),
]

export function nextRatingScaleId(): number {
  return ratingScalesDb.reduce((max, row) => Math.max(max, row.codigo), 0) + 1
}

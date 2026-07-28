import type {
  RatingScaleRecord,
  TeachingLevel,
} from "@/features/establishment/api/types/academic-period/rating-scales"

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

let nextId = 1

function createScale(
  data: Omit<RatingScaleRecord, "codigo" | "teachingLevels">
): RatingScaleRecord {
  return {
    codigo: nextId++,
    ...data,
    teachingLevels: resolveTeachingLevels(data.teachingLevelIds),
  }
}

export const ratingScalesDb: RatingScaleRecord[] = [
  createScale({
    academicPeriodId: 1,
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
    academicPeriodId: 1,
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
    academicPeriodId: 2,
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
    academicPeriodId: 2,
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

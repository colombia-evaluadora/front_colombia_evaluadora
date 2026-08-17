import type { TeachingLevel } from "@/features/establishment/academic-period/api/types/rating-scales"

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

// Una fila = una valoración en UN nivel (igual que `TESCALA_VALORACION` real
// — una escala con varios niveles son varias filas con el mismo
// nombre/abreviacion/tipoId, una por nivel). `tipoId`/`iconoId`/
// `iconoCategoria` son los pk sintéticos que arma `select-catalog.ts` para
// TIPO_VALORACION/GRAFICA_CARITA/GRAFICA_SIMBOLO — se resuelven a
// valor/nombre al leer, igual que el backend real resuelve por TLISTA_VALOR.
export interface RatingScaleRow {
  id: number
  nombre: string
  abreviacion: string
  tipoId: number | null
  iconoId: number | null
  iconoCategoria: "GRAFICA_CARITA" | "GRAFICA_SIMBOLO" | null
  teachingLevelId: number
  notaMinima: number
  notaMaxima: number
  notaEquivalente: number
  academicPeriodId: number
}

export const ratingScalesDb: RatingScaleRow[] = []

export function nextRatingScaleId(): number {
  return ratingScalesDb.reduce((max, row) => Math.max(max, row.id), 0) + 1
}

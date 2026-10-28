import { ratingSymbolsDb } from "@/mocks/db/academic-period/rating-symbols"
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
    nombre: "Básica secundaria",
    grados: ["Sexto", "Séptimo", "Octavo", "Noveno"],
  },
  { id: 4, nombre: "Media", grados: ["Décimo", "Undécimo"] },
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

// pk sintético de una carita: índice + 1 dentro de GRAFICA_CARITA, igual que
// lo arma `select-catalog.ts`.
function caritaId(symbolId: string): number | null {
  const index = ratingSymbolsDb.filter((s) => s.categoria === "carita").findIndex((s) => s.id === symbolId)
  return index === -1 ? null : index + 1
}

// Escala de 0 a 10 del período 1 (Básica primaria y Secundaria), contigua con
// paso 0,1 como pide la Regla 51. tipoId: 1 Fortaleza, 2 Debilidad.
const SEED_SCALE = [
  { nombre: "Superior", abreviacion: "S", tipoId: 1, icono: "carita-02-muy_feliz-verde", min: 9, max: 10, eq: 9.5 },
  { nombre: "Alto", abreviacion: "A", tipoId: 1, icono: "carita-03-feliz-azul", min: 8, max: 8.9, eq: 8.5 },
  { nombre: "Básico", abreviacion: "B", tipoId: 1, icono: "carita-05-neutral-amarillo", min: 6, max: 7.9, eq: 7 },
  { nombre: "Bajo", abreviacion: "BJ", tipoId: 2, icono: "carita-07-triste-rojo", min: 0, max: 5.9, eq: 3 },
]

export const ratingScalesDb: RatingScaleRow[] = [2, 3].flatMap((teachingLevelId, l) =>
  SEED_SCALE.map((v, i) => ({
    id: l * SEED_SCALE.length + i + 1,
    nombre: v.nombre,
    abreviacion: v.abreviacion,
    tipoId: v.tipoId,
    iconoId: caritaId(v.icono),
    iconoCategoria: "GRAFICA_CARITA" as const,
    teachingLevelId,
    notaMinima: v.min,
    notaMaxima: v.max,
    notaEquivalente: v.eq,
    descripcion: null,
    academicPeriodId: 1,
  })),
)

export function nextRatingScaleId(): number {
  return ratingScalesDb.reduce((max, row) => Math.max(max, row.id), 0) + 1
}

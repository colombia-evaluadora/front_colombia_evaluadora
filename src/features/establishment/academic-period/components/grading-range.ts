import { z } from "zod"

// El rango de nota lo define `gradingFormat` en criterios de evaluación.
// Acepta dos formas:
//  - String con rango explícito ("0 - 100", "1 - 5"): viene del mock o
//    legados del catálogo.
//  - FK como string ("51889"): viene de `fn_criterio_eval_obtener` (integración
//    real con el back). Se resuelve contra `FORMAT_MAX_BY_NAME` cuando el FK
//    matchea un NOMBRE del catálogo que conocemos (los nombres siguen el
//    patrón "DE CERO A N"); si no matchea, default 0-100.
//
// Las notas de las escalas de valoración se acotan y validan con ese rango,
// tanto al crearlas como al editarlas. La conversión a porcentaje cuando el
// usuario cambia el rango la resuelve el backend.
export interface GradingRange {
  min: number
  max: number
}

export const DEFAULT_GRADING_RANGE: GradingRange = { min: 0, max: 100 }

// Mapea el NOMBRE del formato de calificación (TLISTA_VALOR.VALOR) al max.
// El FK se matchea primero contra este set antes de caer al default — los
// nombres vienen del catálogo y seanean en MAYÚSCULAS para normalizar.
const FORMAT_MAX_BY_NAME: Record<string, number> = {
  "DE CERO A CINCO": 5,
  "DE CERO A DIEZ": 10,
  "DE CERO A CIEN": 100,
}

export function parseGradingRange(gradingFormat?: string): GradingRange {
  if (!gradingFormat) return DEFAULT_GRADING_RANGE
  // Primero: rango explícito ("0 - 100" — viene del mock o legados)
  const match = gradingFormat.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/)
  if (match) {
    const min = Number(match[1])
    const max = Number(match[2])
    if (!Number.isNaN(min) && !Number.isNaN(max) && min <= max) {
      return { min, max }
    }
  }
  // Segundo: FK del back → matchear contra el catálogo conocido
  const maxFromName = FORMAT_MAX_BY_NAME[gradingFormat.toUpperCase()]
  if (maxFromName != null) {
    return { min: 0, max: maxFromName }
  }
  return DEFAULT_GRADING_RANGE
}

// Esquema de las notas de una escala acotadas al rango del periodo. Sirve tanto
// para el alta (diálogo de crear) como para la edición inline (tab).
export function makeRatingScaleGradesSchema({ min, max }: GradingRange) {
  const nota = z
    .number({ error: "Ingresa una nota válida" })
    .min(min, `Debe ser ${min} o más`)
    .max(max, `No puede superar ${max}`)
  return z
    .object({
      nombre: z.string().min(1, "El nombre es obligatorio"),
      abreviacion: z.string().min(1, "La abreviación es obligatoria"),
      tipo: z.string().min(1, "El tipo de valoración es obligatorio"),
      iconografia: z.string().min(1, "La iconografía es obligatoria"),
      notaMaxima: nota,
      notaMinima: nota,
      notaEquivalente: nota,
    })
    .refine((d) => d.notaMinima <= d.notaMaxima, {
      message: "La nota mínima no puede superar la máxima",
      path: ["notaMinima"],
    })
    .refine((d) => d.notaEquivalente >= d.notaMinima && d.notaEquivalente <= d.notaMaxima, {
      message: "La nota equivalente debe estar entre la nota mínima y la máxima",
      path: ["notaEquivalente"],
    })
}

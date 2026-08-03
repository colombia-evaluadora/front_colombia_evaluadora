import { z } from "zod"

// El rango de nota lo define `gradingFormat` en criterios de evaluación
// (ej. "0 - 100", "1 - 5"); por defecto 0-100. Las notas de las escalas de
// valoración se acotan y validan con ese rango, tanto al crearlas como al
// editarlas. La conversión a porcentaje cuando el usuario cambia el rango la
// resuelve el backend.
export interface GradingRange {
  min: number
  max: number
}

export const DEFAULT_GRADING_RANGE: GradingRange = { min: 0, max: 100 }

export function parseGradingRange(gradingFormat?: string): GradingRange {
  const match = gradingFormat?.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/)
  if (!match) return DEFAULT_GRADING_RANGE
  const min = Number(match[1])
  const max = Number(match[2])
  if (Number.isNaN(min) || Number.isNaN(max) || min > max) {
    return DEFAULT_GRADING_RANGE
  }
  return { min, max }
}

// Esquema de las notas de una escala acotadas al rango del periodo. Sirve tanto
// para el alta (diálogo de crear) como para la edición inline (tab).
export function makeRatingScaleGradesSchema({ min, max }: GradingRange) {
  const nota = z
    .number({ error: "Ingresá una nota válida" })
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
}

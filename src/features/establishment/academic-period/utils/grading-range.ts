import { z } from "zod"
export interface GradingRange {
  min: number
  max: number
}

export const DEFAULT_GRADING_RANGE: GradingRange = { min: 0, max: 100 }

const FORMAT_MAX_BY_NAME: Record<string, number> = {
  "DE CERO A CINCO": 5,
  "DE CERO A DIEZ": 10,
  "DE CERO A CIEN": 100,
}

export function parseGradingRange(gradingFormat?: string): GradingRange {
  if (!gradingFormat) return DEFAULT_GRADING_RANGE
  const match = gradingFormat.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/)
  if (match) {
    const min = Number(match[1])
    const max = Number(match[2])
    if (!Number.isNaN(min) && !Number.isNaN(max) && min <= max) {
      return { min, max }
    }
  }
  const maxFromName = FORMAT_MAX_BY_NAME[gradingFormat.toUpperCase()]
  if (maxFromName != null) {
    return { min: 0, max: maxFromName }
  }
  return DEFAULT_GRADING_RANGE
}

export function makeRatingScaleGradesSchema({ min, max }: GradingRange) {
  const nota = z
    .number({ error: "Ingresa una nota válida" })
    .min(min, `Debe ser ${min} o más`)
    .max(max, `No puede superar ${max}`)
  return z
    .object({
      nombre: z
        .string()
        .min(1, "El nombre es obligatorio")
        .max(130, "El nombre no puede superar los 130 caracteres"),
      abreviacion: z
        .string()
        .min(1, "La abreviación es obligatoria")
        .max(30, "La abreviación no puede superar los 30 caracteres"),
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

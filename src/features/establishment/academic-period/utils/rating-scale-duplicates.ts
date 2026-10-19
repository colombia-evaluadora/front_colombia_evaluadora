export interface RatingScaleNameFields {
  nombre: string
  abreviacion: string
}

export type RatingScaleDuplicateField = "nombre" | "abreviacion"

export function findDuplicateRatingScale<T extends RatingScaleNameFields>(
  candidate: RatingScaleNameFields,
  scales: T[],
  exclude?: (scale: T) => boolean,
): { field: RatingScaleDuplicateField; scale: T } | undefined {
  const nombre = candidate.nombre.trim().toUpperCase()
  const abreviacion = candidate.abreviacion.trim().toUpperCase()
  for (const scale of scales) {
    if (exclude?.(scale)) continue
    if (nombre && scale.nombre.trim().toUpperCase() === nombre) {
      return { field: "nombre", scale }
    }
    if (abreviacion && scale.abreviacion.trim().toUpperCase() === abreviacion) {
      return { field: "abreviacion", scale }
    }
  }
  return undefined
}

export function ratingScaleDuplicateMessage(field: RatingScaleDuplicateField, value: string): string {
  return field === "nombre"
    ? `Ya existe una escala de valoración con el nombre "${value}" en este nivel de enseñanza.`
    : `Ya existe una escala de valoración con la abreviación "${value}" en este nivel de enseñanza.`
}

export interface RatingScaleRangeFields {
  notaMinima: number
  notaMaxima: number
}

export function findOverlappingRatingScale<T extends RatingScaleRangeFields>(
  candidate: RatingScaleRangeFields,
  scales: T[],
): T | undefined {
  return scales.find(
    (scale) =>
      candidate.notaMinima <= scale.notaMaxima && scale.notaMinima <= candidate.notaMaxima,
  )
}

export function ratingScaleOverlapMessage(scale: RatingScaleNameFields): string {
  return `El rango de notas se solapa con la escala "${scale.nombre}" en este nivel de enseñanza.`
}

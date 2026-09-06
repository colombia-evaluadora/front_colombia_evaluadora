export interface RatingScaleNameFields {
  nombre: string
  abreviacion: string
}

export type RatingScaleDuplicateField = "nombre" | "abreviacion"

// Mismo criterio que `findDuplicateAbreviacion`/`findDuplicateNombreEnfasis`
// en `dialog-area-subject-form.tsx`: comparación insensible a mayúsculas y
// espacios. `scales` debe venir prefiltrada al nivel de enseñanza relevante —
// la restricción de unicidad es por nivel (MantisBT 0000731/0000734).
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

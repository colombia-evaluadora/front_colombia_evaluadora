import type { RatingScaleTypeOption } from "@/features/establishment/academic-period/api/types/rating-scales"

// Catálogo de tipos de valoración. Simula lo que en producción entrega el
// backend (`key` + `label`), para no hardcodear las opciones del select ni sus
// etiquetas.
export const ratingScaleTypesDb: RatingScaleTypeOption[] = [
  { key: "Fortaleza", label: "Fortaleza" },
  { key: "Debilidad", label: "Debilidad" },
]

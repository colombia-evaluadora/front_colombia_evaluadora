import type { RatingScaleType } from "@/features/establishment/academic-period/api/types/rating-scales"

// Catálogo de tipos de valoración. Simula lo que en producción entrega el
// backend, para no hardcodear las opciones del select.
export const ratingScaleTypesDb: RatingScaleType[] = ["Fortaleza", "Debilidad"]

import { useQuery } from "@tanstack/react-query"

import type { RatingScaleType, RatingScaleTypeOption } from "@/features/establishment/academic-period/api/types/rating-scales"
import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"

// Catálogo genérico de TLISTA_VALOR (`GET /eval-col/select/TIPO_VALORACION`,
// 2 filas: Fortaleza/Debilidad). `key` es el VALOR — lo que ya guarda
// `RatingScale.tipo` y lo que espera `fn_escala_listar`; `fn_escala_guardar_bulk`
// en cambio pide el PK (ver resolve-rating-scale-refs.ts).
async function fetchRatingScaleTypes(): Promise<RatingScaleTypeOption[]> {
  const rows = await fetchSelectCategory("TIPO_VALORACION")
  return rows.map((row) => ({ key: row.valor as RatingScaleType, label: row.nombre }))
}

export const ratingScaleTypesQueryKey = () => ["rating-scale-types"]

// Catálogo estable de tipos de valoración; se cachea indefinidamente como las
// demás listas de referencia.
export function useRatingScaleTypesQuery() {
  return useQuery({
    queryKey: ratingScaleTypesQueryKey(),
    queryFn: fetchRatingScaleTypes,
    staleTime: Infinity,
  })
}

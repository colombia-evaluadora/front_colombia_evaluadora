import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { RatingScaleType } from "../../types/rating-scales"

function fetchRatingScaleTypes(): Promise<RatingScaleType[]> {
  return api.get("/rating-scale-types")
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

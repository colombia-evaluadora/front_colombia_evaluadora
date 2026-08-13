import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { RatingSymbol } from "@/features/establishment/academic-period/types/rating-scales"

function fetchRatingSymbols(): Promise<RatingSymbol[]> {
  return api.get("/rating-symbols")
}

export const ratingSymbolsQueryKey = () => ["rating-symbols"]

export function useRatingSymbolsQuery() {
  return useQuery({
    queryKey: ratingSymbolsQueryKey(),
    queryFn: fetchRatingSymbols,
    staleTime: Infinity,
  })
}

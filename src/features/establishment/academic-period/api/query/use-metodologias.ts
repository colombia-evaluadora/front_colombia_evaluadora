import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MetodologiaOption } from "@/features/establishment/academic-period/api/types/metodologia"

function fetchMetodologias(): Promise<MetodologiaOption[]> {
  return api.get("/metodologias")
}

export const metodologiasQueryKey = () => ["metodologias"]

export function useMetodologiasQuery() {
  return useQuery({
    queryKey: metodologiasQueryKey(),
    queryFn: fetchMetodologias,
    staleTime: Infinity,
  })
}
 
import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

function fetchMetodologias(): Promise<string[]> {
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
 
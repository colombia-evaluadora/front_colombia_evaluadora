import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { Jornada } from "@/features/establishment/academic-period/api/types/jornada"

function fetchJornadas(): Promise<Jornada[]> {
  return api.get("/jornadas")
}

export const jornadasQueryKey = () => ["jornadas"]

export function useJornadasQuery() {
  return useQuery({
    queryKey: jornadasQueryKey(),
    queryFn: fetchJornadas,
    staleTime: Infinity,
  })
}

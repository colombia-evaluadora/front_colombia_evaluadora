import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { Sede } from "../types/sede"

function fetchSedes(): Promise<Sede[]> {
  return api.get("/sedes")
}

export const sedesQueryKey = () => ["sedes"]

export function useSedesQuery() {
  return useQuery({
    queryKey: sedesQueryKey(),
    queryFn: fetchSedes,
    staleTime: Infinity,
  })
}

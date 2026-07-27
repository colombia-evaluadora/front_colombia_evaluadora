import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { GeneralArea } from "../types/academic-period/general-area"

function fetchGeneralAreas(): Promise<GeneralArea[]> {
  return api.get("/general-areas")
}

export const generalAreasQueryKey = () => ["general-areas"]

export function useGeneralAreasQuery() {
  return useQuery({
    queryKey: generalAreasQueryKey(),
    queryFn: fetchGeneralAreas,
    staleTime: Infinity,
  })
}

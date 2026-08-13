import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type { Campus } from "@/features/establishment/campuses/api/types/campus"

interface CampusQueryResult {
  status: "ok"
  campus: Campus
}

function fetchCampus(id: number): Promise<CampusQueryResult> {
  return api.get(`/establishments/campuses/${id}`)
}

export function useCampusQuery(id: number | null, enabled = true) {
  return useQuery({
    queryKey: ["campuses", id],
    queryFn: () => fetchCampus(id as number),
    enabled: enabled && Boolean(id),
  })
}
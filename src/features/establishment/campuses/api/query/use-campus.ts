import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type { Campus } from "@/features/establishment/campuses/api/types/campus"

interface CampusQueryResult {
  status: "ok"
  campus: Campus
}

function fetchCampus(id: string): Promise<CampusQueryResult> {
  return api.get(`/establishments/campuses/${id}`)
}

export function useCampusQuery(id: string | null, enabled = true) {
  return useQuery({
    queryKey: ["campuses", id],
    queryFn: () => fetchCampus(id as string),
    enabled: enabled && Boolean(id),
  })
}
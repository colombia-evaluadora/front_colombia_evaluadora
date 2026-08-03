import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type { Campus } from "../types/campus"

interface CampusesOptionsResult {
  rows: Campus[]
}

function fetchCampusesOptions(): Promise<CampusesOptionsResult> {
  return api.get("/establishments/campuses/options")
}

export function useCampusesOptionsQuery() {
  return useQuery({
    queryKey: ["campuses", "options"],
    queryFn: fetchCampusesOptions,
    select: (result) => result.rows,
  })
}

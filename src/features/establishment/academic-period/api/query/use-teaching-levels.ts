import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { TeachingLevel } from "@/features/establishment/academic-period/api/types/rating-scales"

function fetchTeachingLevels(): Promise<TeachingLevel[]> {
  return api.get("/teaching-levels")
}

export const teachingLevelsQueryKey = () => ["teaching-levels"]

export function useTeachingLevelsQuery() {
  return useQuery({
    queryKey: teachingLevelsQueryKey(),
    queryFn: fetchTeachingLevels,
    staleTime: Infinity,
  })
}

import { useQuery } from "@tanstack/react-query"

import { fetchTeachingLevels } from "@/features/establishment/academic-period/api/query/use-teaching-levels"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { catalogoMeta } from "@/lib/offline/query-meta"

async function fetchEducationLevels(): Promise<CatalogItem[]> {
  const levels = await fetchTeachingLevels()
  return levels.map((level) => ({ id: level.id, code: "", name: level.nombre }))
}

export const educationLevelsQueryKey = () => ["curricular-reference-education-levels"]

export function useEducationLevelsQuery() {
  return useQuery({
    meta: catalogoMeta(),
    queryKey: educationLevelsQueryKey(),
    queryFn: fetchEducationLevels,
    staleTime: Infinity,
  })
}

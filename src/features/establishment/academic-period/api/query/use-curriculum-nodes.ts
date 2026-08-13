import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { CurriculumNodeOption } from "@/features/establishment/academic-period/api/types/curriculum-node"

function fetchCurriculumNodes(): Promise<CurriculumNodeOption[]> {
  return api.get("/curriculum-nodes")
}

export const curriculumNodesQueryKey = () => ["curriculum-nodes"]

// Catálogo estable de nodos curriculares; se cachea indefinidamente como las
// demás listas de referencia.
export function useCurriculumNodesQuery() {
  return useQuery({
    queryKey: curriculumNodesQueryKey(),
    queryFn: fetchCurriculumNodes,
    staleTime: Infinity,
  })
}
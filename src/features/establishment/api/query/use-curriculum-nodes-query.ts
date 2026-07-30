import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

function fetchCurriculumNodes(): Promise<string[]> {
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
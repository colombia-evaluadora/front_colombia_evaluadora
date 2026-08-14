import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { CurriculumNodeOption } from "@/features/establishment/academic-period/api/types/curriculum-node"

interface CurriculumNodesResponse {
  rows: CurriculumNodeOption[]
}

// `GET /eval-col/catalogos/nodos-curriculares` (confirmado): solo dos nodos,
// `{key: "AS", label: "Asignatura"}` / `{key: "AR", label: "Area"}`.
async function fetchCurriculumNodes(): Promise<CurriculumNodeOption[]> {
  const raw: CurriculumNodesResponse = await api.get(
    "/eval-col/catalogos/nodos-curriculares"
  )
  return raw.rows ?? []
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
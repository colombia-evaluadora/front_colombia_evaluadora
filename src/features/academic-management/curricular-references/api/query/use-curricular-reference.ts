import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type { CurricularReference } from "@/features/academic-management/curricular-references/api/types/curricular-reference"

interface CurricularReferenceResponse {
  status: "ok" | "error"
  message?: string
  curricularReference?: CurricularReference
}

async function fetchCurricularReference(id: number): Promise<CurricularReference> {
  const response = await api.get<CurricularReferenceResponse>(
    `/academic-management/curricular-references/${id}`,
  )

  if (response.status === "error" || !response.curricularReference) {
    throw new Error(response.message ?? "Referente curricular no encontrado.")
  }

  return response.curricularReference
}

export const curricularReferenceQueryKey = (id: number) => ["curricular-reference", id]

export function useCurricularReferenceQuery(id: number) {
  return useQuery({
    queryKey: curricularReferenceQueryKey(id),
    queryFn: () => fetchCurricularReference(id),
    enabled: Number.isFinite(id),
  })
}

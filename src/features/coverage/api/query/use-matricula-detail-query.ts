import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MatriculaDetailResult } from "@/features/coverage/api/types/matricula"

function fetchMatriculaDetail(id: string): Promise<MatriculaDetailResult> {
  return api.get(`/coverage/matricula/${id}`)
}

export function useMatriculaDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["matricula", "detail", id],
    queryFn: () => fetchMatriculaDetail(id as string),
    enabled: Boolean(id),
  })
}

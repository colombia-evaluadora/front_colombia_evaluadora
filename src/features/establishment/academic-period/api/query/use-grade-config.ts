import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { GradeConfig } from "@/features/establishment/academic-period/api/types/grade-config"

function fetchGradeConfig(gradeId: number): Promise<GradeConfig> {
  return api.get(`/grades/${gradeId}/config`)
}

export const gradeConfigQueryKey = (gradeId: number) => ["grade-config", gradeId]

export function useGradeConfigQuery(gradeId: number | undefined) {
  return useQuery({
    queryKey: gradeConfigQueryKey(gradeId ?? 0),
    queryFn: () => fetchGradeConfig(gradeId as number),
    enabled: gradeId != null,
  })
}

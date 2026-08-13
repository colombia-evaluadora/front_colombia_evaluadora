import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { AcademicPeriodDetail } from "@/features/establishment/academic-period/types/academic-period"

function fetchAcademicPeriod(id: number): Promise<AcademicPeriodDetail> {
  return api.get(`/academic-periods/${id}`)
}

export const academicPeriodQueryKey = (id: number) => ["academic-period", id]

export function useAcademicPeriodQuery(id: number | undefined) {
  return useQuery({
    queryKey: academicPeriodQueryKey(id ?? 0),
    queryFn: () => fetchAcademicPeriod(id as number),
    enabled: id != null,
  })
}

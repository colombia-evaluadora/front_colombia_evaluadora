import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { AcademicPeriodStatusOption } from "@/features/establishment/academic-period/types/academic-period"

function fetchAcademicPeriodStatuses(): Promise<AcademicPeriodStatusOption[]> {
  return api.get("/academic-period-statuses")
}

export const academicPeriodStatusesQueryKey = () => ["academic-period-statuses"]

export function useAcademicPeriodStatusesQuery() {
  return useQuery({
    queryKey: academicPeriodStatusesQueryKey(),
    queryFn: fetchAcademicPeriodStatuses,
    staleTime: Infinity,
  })
}

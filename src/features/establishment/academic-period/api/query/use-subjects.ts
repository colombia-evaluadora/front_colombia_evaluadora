import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

function fetchSubjects(academicPeriodId?: number): Promise<string[]> {
  const qs = academicPeriodId != null ? `?academicPeriodId=${academicPeriodId}` : ""
  return api.get(`/subjects${qs}`)
}

export const subjectsQueryKey = (academicPeriodId?: number) => [
  "subjects",
  academicPeriodId,
]

export function useSubjectsQuery(academicPeriodId?: number) {
  return useQuery({
    queryKey: subjectsQueryKey(academicPeriodId),
    queryFn: () => fetchSubjects(academicPeriodId),
  })
}

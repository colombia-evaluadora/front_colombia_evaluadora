import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { SchoolYearOption } from "../types/academic-period"

interface SchoolYearsRawResponse {
  rows: SchoolYearOption[]
}

async function fetchSchoolYears(): Promise<SchoolYearOption[]> {
  const raw = await api.get<SchoolYearsRawResponse>(
    "/eval-col/periodos-academicos/anos-lectivos"
  )
  return raw.rows ?? []
}

export const schoolYearsQueryKey = () => ["academic-periods", "school-years"]

export function useSchoolYearsQuery() {
  return useQuery({
    queryKey: schoolYearsQueryKey(),
    queryFn: fetchSchoolYears,
    staleTime: Infinity,
  })
}

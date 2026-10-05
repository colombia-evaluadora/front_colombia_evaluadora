import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { SchoolYearOption } from "../types/academic-period"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"

interface SchoolYearsRawResponse {
  rows: SchoolYearOption[]
}

async function fetchSchoolYears(): Promise<SchoolYearOption[]> {
  const raw = await api.get<SchoolYearsRawResponse>(
    "/eval-col/periodos-academicos/anos-lectivos"
  )
  return raw.rows ?? []
}

export function useSchoolYearsQuery() {
  return useQuery({
    queryKey: academicPeriodKeys.academicPeriods.schoolYears(),
    queryFn: fetchSchoolYears,
    staleTime: Infinity,
  })
}

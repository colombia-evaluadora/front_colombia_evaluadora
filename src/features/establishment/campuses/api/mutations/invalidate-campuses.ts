import type { QueryClient } from "@tanstack/react-query"

import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"
import { campusKeys } from "@/features/establishment/campuses/api/query-keys"

// Las sedes también se leen desde periodos académicos (`sedeOptions`), cuya key
// no cuelga de `["campuses"]`: sin invalidarla, el select de sedes queda viejo.
export function invalidateCampuses(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: campusKeys.all })
  queryClient.invalidateQueries({ queryKey: academicPeriodKeys.sedeOptions() })
}

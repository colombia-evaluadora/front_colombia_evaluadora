import type { QueryClient } from "@tanstack/react-query"

import { festivoKeys } from "@/features/administration/festivos/api/query-keys"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"

/**
 * La lista y los calendarios académicos: cada cambio re-copia los festivos de
 * los períodos que aún no han comenzado (V337.3).
 */
export function invalidarFestivos(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: festivoKeys.all })
  queryClient.invalidateQueries({ queryKey: academicPeriodKeys.academicCalendar.all })
}

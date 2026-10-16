import type { QueryClient } from "@tanstack/react-query"

import { areaOficialKeys } from "@/features/administration/areas-oficiales/api/query-keys"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"

/**
 * Todo el catálogo (listado y selectores) y `/areas/general`, que lee la misma
 * tabla (`TAREA_ASIGNATURA`) para el Plan de Estudio.
 */
export function invalidarAreasOficiales(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: areaOficialKeys.all })
  queryClient.invalidateQueries({ queryKey: academicPeriodKeys.generalAreas() })
}

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type {
  AsistenciaQueryRequest,
  AsistenciaQueryRow,
} from "@/features/academic-management/asistencia/api/types/asistencia"

interface AsistenciaSeguimientoRawResponse {
  rows: AsistenciaQueryRow[]
}

// La sede viaja en FILTERS.SEDE, no en la query string: el endpoint no la
// declara como parámetro de ruta y así el export (que solo manda FILTERS) queda
// acotado igual que la tabla.
export async function fetchAsistenciaSeguimiento(
  body: AsistenciaQueryRequest,
): Promise<AsistenciaSeguimientoRawResponse> {
  return api.post<AsistenciaSeguimientoRawResponse>("/eval-col/asistencias/query", body)
}

export function useAsistenciaSeguimientoQuery(body: AsistenciaQueryRequest, enabled = true) {
  return useQuery({
    queryKey: ["asistencia", "seguimiento", body],
    queryFn: () => fetchAsistenciaSeguimiento(body),
    placeholderData: (previous) => previous,
    enabled,
  })
}

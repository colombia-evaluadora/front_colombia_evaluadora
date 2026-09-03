import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type {
  AsistenciaQueryRequest,
  AsistenciaQueryRow,
} from "@/features/academic-management/asistencia/api/types/asistencia"

interface AsistenciaSeguimientoRawResponse {
  rows: AsistenciaQueryRow[]
}

export async function fetchAsistenciaSeguimiento(
  body: AsistenciaQueryRequest,
  sede: number,
): Promise<AsistenciaSeguimientoRawResponse> {
  return api.post<AsistenciaSeguimientoRawResponse>("/eval-col/asistencias/query", body, {
    params: { SEDE: sede },
  })
}

export function useAsistenciaSeguimientoQuery(body: AsistenciaQueryRequest, sede: number, enabled = true) {
  return useQuery({
    queryKey: ["asistencia", "seguimiento", body, sede],
    queryFn: () => fetchAsistenciaSeguimiento(body, sede),
    placeholderData: (previous) => previous,
    enabled,
  })
}

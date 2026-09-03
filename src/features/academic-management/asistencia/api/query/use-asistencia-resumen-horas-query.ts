import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type {
  AsistenciaResumenHorasParams,
  ResumenHoras,
} from "@/features/academic-management/asistencia/api/types/asistencia"

interface RawResumenHoras extends ResumenHoras {
  horas_programadas_semana?: number
  horas_programadas_mes?: number
}

export async function fetchAsistenciaResumenHoras(
  params: AsistenciaResumenHorasParams,
): Promise<ResumenHoras | undefined> {
  const raw = await api.get<{ rows: RawResumenHoras[] } | RawResumenHoras[] | RawResumenHoras>(
    "/eval-col/asistencias/resumen-horas",
    { params },
  )
  const row = Array.isArray(raw) ? raw[0] : "rows" in raw ? raw.rows[0] : raw
  return row
}

export function useAsistenciaResumenHorasQuery(
  params: AsistenciaResumenHorasParams,
  enabled = true,
) {
  return useQuery({
    queryKey: ["asistencia", "resumen-horas", params],
    queryFn: () => fetchAsistenciaResumenHoras(params),
    enabled,
  })
}

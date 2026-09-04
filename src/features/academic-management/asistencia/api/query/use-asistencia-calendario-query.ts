import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type {
  AsistenciaCalendarioParams,
  SesionCalendario,
} from "@/features/academic-management/asistencia/api/types/asistencia"

interface RawSesionCalendario extends Omit<SesionCalendario, "fk_grupo" | "fk_asignatura" | "grado" | "jornada"> {
  fk_grupo?: number
  fk_tgrupo?: number
  fk_asignatura?: number
  fk_tasignatura?: number
  grado?: string
  grado_valor?: string
  jornada?: string
  jornada_valor?: string
}

function normalizarSesion(raw: RawSesionCalendario): SesionCalendario {
  return {
    ...raw,
    fecha: raw.fecha.slice(0, 10),
    fk_grupo: raw.fk_grupo ?? raw.fk_tgrupo ?? 0,
    fk_asignatura: raw.fk_asignatura ?? raw.fk_tasignatura ?? 0,
    grado: raw.grado_valor ?? raw.grado ?? "",
    jornada: raw.jornada_valor ?? raw.jornada ?? "",
  }
}

export async function fetchAsistenciaCalendario(
  params: AsistenciaCalendarioParams,
): Promise<SesionCalendario[]> {
  const raw = await api.get<{ rows: RawSesionCalendario[] } | RawSesionCalendario[]>(
    "/eval-col/asistencias/calendario",
    { params },
  )
  const rows = Array.isArray(raw) ? raw : (raw.rows ?? [])
  return rows.map(normalizarSesion)
}

export function useAsistenciaCalendarioQuery(params: AsistenciaCalendarioParams, enabled = true) {
  return useQuery({
    queryKey: ["asistencia", "calendario", params],
    queryFn: () => fetchAsistenciaCalendario(params),
    enabled,
  })
}

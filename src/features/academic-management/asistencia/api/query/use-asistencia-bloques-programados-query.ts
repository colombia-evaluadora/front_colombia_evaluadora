import { api } from "@/lib/api-client"

interface AsistenciaBloqueProgramadoRow {
  bloque: number
}

export interface AsistenciaBloquesProgramadosParams {
  GRUPO: number
  ASIGNATURA: number
  FECHA: string
}

/** `GET /asistencias/sesion/bloques` (V481) — los bloques reales de THORARIO
 *  para un grupo+asignatura en una fecha puntual. Quien no maneja horario
 *  (Planeador) la usa para registrar asistencia contra la clase programada
 *  real en vez de una toma suelta sin bloque, que `fn_asistencia_calendario`
 *  nunca empareja con la sesión. Puede devolver más de un bloque. */
export async function fetchAsistenciaBloquesProgramados(
  params: AsistenciaBloquesProgramadosParams,
): Promise<number[]> {
  const raw = await api.get<{ rows: AsistenciaBloqueProgramadoRow[] } | AsistenciaBloqueProgramadoRow[]>(
    "/eval-col/asistencias/sesion/bloques",
    { params },
  )
  const rows = Array.isArray(raw) ? raw : (raw.rows ?? [])
  return rows.map((row) => row.bloque)
}

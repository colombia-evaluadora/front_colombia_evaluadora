import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type { SolicitudAprobacionAsistencia } from "@/features/academic-management/asistencia/api/types/asistencia"

/** Regla 75: solicitudes de corrección de asistencia que el coordinador puede resolver. */
export function useAprobacionesAsistenciaQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["asistencia", "aprobaciones"],
    queryFn: async () => {
      const raw = await api.get<{ rows: SolicitudAprobacionAsistencia[] } | SolicitudAprobacionAsistencia[]>(
        "/eval-col/aprobaciones/pendientes",
        { params: { tipo: "CORRECCION_ASISTENCIA" } },
      )
      return Array.isArray(raw) ? raw : (raw.rows ?? [])
    },
    enabled,
  })
}

/** Una tarjeta del banner: las solicitudes de una misma clase (grupo + asignatura/actividad + fecha). */
export interface SesionSolicitudes {
  clave: string
  fkGrupo: number
  grupo: string
  materia: string
  fecha: string | null
  solicitante: string | null
  solicitudes: SolicitudAprobacionAsistencia[]
}

/** Clase = grupo + asignatura/actividad + fecha de la sesión. */
export function agruparPorSesion(solicitudes: SolicitudAprobacionAsistencia[]): SesionSolicitudes[] {
  const porSesion = new Map<string, SesionSolicitudes>()
  for (const s of solicitudes) {
    const fecha = (s.fecha ?? s.valor_anterior?.fecha)?.slice(0, 10) ?? null
    const clave = `${s.fk_tgrupo}|${s.fk_tasignatura}|${s.fk_tactividad}|${fecha}`
    const sesion = porSesion.get(clave) ?? {
      clave,
      fkGrupo: s.fk_tgrupo,
      grupo: s.grupo,
      materia: s.actividad ?? s.asignatura ?? "",
      fecha,
      solicitante: s.solicitante,
      solicitudes: [],
    }
    sesion.solicitudes.push(s)
    porSesion.set(clave, sesion)
  }
  return [...porSesion.values()]
}

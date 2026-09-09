import { queryOptions, useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { env } from "@/config/env"

import type { CalificacionEstudiante, EstadoAsistencia } from "@/features/planeador/api/types/calificacion"

function calificacionesUrl(id: number): string {
  return `/planeador/actividades/${id}/calificaciones`
}

export const calificacionesQueryKey = (id: number) =>
  ["planeador", "actividad", id, "calificaciones"] as const

/**
 * Fila real de `GET /planeador/actividades/:id/calificaciones` (confirmada
 * en vivo, colección Postman `planeador-guia-completa`, 7.8) — escalares
 * sueltos, sin los objetos anidados `asistencia`/`notas` que espera
 * `CalificacionEstudiante`. `pk_tactividad_estudiante` es el id real que
 * exigen 7.1/7.7 (`PUT/GET .../estudiantes/:ID/...`), NO `pk_tmatricula`.
 *
 * `tipo_asistencia` viene `null` cuando todavía no hay registro de
 * asistencia ese día ("no es un error" — se toma en otro módulo). Los
 * valores que SÍ trae el catálogo cuando hay registro no están confirmados
 * contra una respuesta real todavía (esta captura solo mostró el caso
 * `null`) — mientras tanto se intenta reconocer "ausente"/"tarde" por
 * palabra clave y, si no calza con ninguna, se cae a "asistió" en vez de
 * inventar un mapeo que probablemente no calce (mismo criterio que
 * `valoracion_nombre` en su momento).
 */
interface CalificacionRow {
  pk_tactividad_estudiante: number
  pk_tmatricula: number
  nombre_estudiante: string
  instrumento: string | null
  fecha: string
  pk_tasistencia: number | null
  fk_tlv_tipo_asistencia: number | null
  tipo_asistencia: string | null
  asistencia_observacion: string | null
  fk_soporte_archivo: number | null
  calificacion: number | null
  calificable: "S" | "N"
  nota_observacion: string | null
}

function toEstadoAsistencia(tipoAsistencia: string | null): EstadoAsistencia {
  if (!tipoAsistencia) return "sin-registrar"
  const lower = tipoAsistencia.toLowerCase()
  if (lower.includes("ausen") || lower.includes("no_asis") || lower.includes("no asis")) {
    return "no-asistio"
  }
  if (lower.includes("tard")) return "llego-tarde"
  return "asistio"
}

function toCalificacionEstudiante(row: CalificacionRow): CalificacionEstudiante {
  return {
    id: row.pk_tactividad_estudiante,
    nombres: row.nombre_estudiante,
    // El real no separa nombres/apellidos — viene un solo `nombre_estudiante`.
    apellidos: "",
    asistencia: {
      estado: toEstadoAsistencia(row.tipo_asistencia),
      justificacion: row.asistencia_observacion ?? undefined,
      adjuntos: row.fk_soporte_archivo != null ? 1 : 0,
    },
    // El detalle de notas por criterio vive aparte (`GET .../estudiantes/:ID/nota`,
    // 7.7) — acá solo llega el porcentaje ya resuelto (`calificacion`), no
    // el desglose por criterio que pide `NotaCriterio[]`. Se deja vacío en
    // vez de inventar un criterio sintético; la vista muestra `calificacion`
    // directo en vez de recalcularlo de `notas` (ver el campo de abajo).
    notas: [],
    calificacion: row.calificacion,
  }
}

/**
 * Calificaciones (asistencia + notas) de una actividad. El sobre `{rows:
 * [...]}` es igual en mock y real; lo que cambia es la forma de cada fila
 * — el mock ya entrega `CalificacionEstudiante` completa, el real entrega
 * `CalificacionRow` y hay que traducirla (`toCalificacionEstudiante`).
 */
async function fetchCalificaciones(id: number): Promise<CalificacionEstudiante[]> {
  const rows = await evalCol.getRows<CalificacionEstudiante | CalificacionRow>(calificacionesUrl(id))
  if (env.ENABLE_API_MOCKING) return rows as CalificacionEstudiante[]
  return (rows as CalificacionRow[]).map(toCalificacionEstudiante)
}

/**
 * Mismo query que `useCalificacionesQuery`, como `queryOptions` — para la
 * Planilla, que necesita pedir las calificaciones de VARIAS actividades a la
 * vez con `useQueries` en vez de un solo `useQuery` por id.
 */
export function calificacionesQueryOptions(id: number) {
  return queryOptions({
    queryKey: calificacionesQueryKey(id),
    queryFn: () => fetchCalificaciones(id),
    staleTime: 1000 * 60,
  })
}

export function useCalificacionesQuery(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? calificacionesQueryKey(id) : ["planeador", "actividad", "none", "calificaciones"],
    queryFn: () => fetchCalificaciones(id!),
    enabled: id !== undefined,
    staleTime: 1000 * 60,
  })
}

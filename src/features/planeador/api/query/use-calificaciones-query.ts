import { queryOptions, useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { env } from "@/config/env"

import type {
  CalificacionEstudiante,
  EstadoAsistencia,
  EstadoResultado,
} from "@/features/planeador/api/types/calificacion"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

function calificacionesUrl(id: number, fecha?: string): string {
  const base = `/planeador/actividades/${id}/calificaciones`
  return fecha ? `${base}?fecha=${fecha}` : base
}

/**
 * Fila real de `GET /planeador/actividades/:id/calificaciones` (confirmada
 * en vivo, colección Postman `planeador-guia-completa`, 7.8) — escalares
 * sueltos, sin los objetos anidados `asistencia`/`notas` que espera
 * `CalificacionEstudiante`. `pk_tactividad_estudiante` es el id real que
 * exigen 7.1/7.7 (`PUT/GET .../estudiantes/:ID/...`), NO `pk_tmatricula`.
 *
 * La asistencia es la de la actividad (fecha fin si ya se tomó, si no el
 * primer día; o la marcada en el Planeador). `tipo_asistencia_valor` viene
 * `null` si el estudiante todavía no tiene asistencia.
 */
interface CalificacionRow {
  pk_tactividad_estudiante: number
  pk_tmatricula: number
  nombre_estudiante: string
  instrumento: string | null
  /** Eco de `?fecha=` (hoy por defecto), NO una fecha con asistencia — para
   *  `BODY.FECHA` va `fecha_asistencia` (V442). */
  fecha: string
  /** V442/V443: el día, dentro de la ventana de la actividad, en que ESE
   *  estudiante tiene asistencia que el gate acepta. `null` = todavía no se
   *  puede calificar ni observar. */
  fecha_asistencia: string | null
  es_formativa: boolean | null
  pk_tasistencia: number | null
  fk_tlv_tipo_asistencia: number | null
  tipo_asistencia: string | null
  asistencia_observacion: string | null
  fk_soporte_archivo: number | null
  calificacion: number | null
  nota_homologada: number | null
  calificable: "S" | "N"
  nota_observacion: string | null
  /** `1` Asistió, `2` No asistió, `5` Llegó tarde (3/6 solo en históricos). */
  tipo_asistencia_valor: string | null
  /** Hay excusa (archivo) ese día. */
  asistencia_justificada: boolean | null
  /** `false` si ya hay nota u observación. */
  asistencia_editable: boolean | null
  estado_resultado: EstadoResultado | null
}

function toEstadoAsistencia(valor: string | null): EstadoAsistencia {
  switch (valor) {
    case "1":
      return "asistio"
    case "2":
    case "3":
      return "no-asistio"
    case "5":
    case "6":
      return "llego-tarde"
    default:
      return "sin-registrar"
  }
}

function toCalificacionEstudiante(row: CalificacionRow): CalificacionEstudiante {
  return {
    id: row.pk_tactividad_estudiante,
    matriculaId: row.pk_tmatricula,
    nombres: row.nombre_estudiante,
    // El real no separa nombres/apellidos — viene un solo `nombre_estudiante`.
    apellidos: "",
    asistencia: {
      estado: toEstadoAsistencia(row.tipo_asistencia_valor),
      justificada: row.asistencia_justificada === true,
      justificacion: row.asistencia_observacion ?? undefined,
      adjuntos: row.fk_soporte_archivo != null ? 1 : 0,
      fkSoporteArchivo: row.fk_soporte_archivo,
    },
    // El detalle de notas por criterio vive aparte (`GET .../estudiantes/:ID/nota`,
    // 7.7) — acá solo llega el porcentaje ya resuelto (`calificacion`), no
    // el desglose por criterio que pide `NotaCriterio[]`. Se deja vacío en
    // vez de inventar un criterio sintético; la vista muestra `calificacion`
    // directo en vez de recalcularlo de `notas` (ver el campo de abajo).
    notas: [],
    calificacion: row.calificacion,
    notaHomologada: row.nota_homologada,
    observacion: row.nota_observacion,
    fechaAsistencia: row.fecha_asistencia ? row.fecha_asistencia.slice(0, 10) : null,
    noPresento: row.estado_resultado === "NO_PRESENTO",
    estadoResultado: row.estado_resultado ?? undefined,
    asistenciaEditable: row.asistencia_editable !== false,
  }
}

/**
 * Calificaciones (asistencia + notas) de una actividad. El sobre `{rows:
 * [...]}` es igual en mock y real; lo que cambia es la forma de cada fila
 * — el mock ya entrega `CalificacionEstudiante` completa, el real entrega
 * `CalificacionRow` y hay que traducirla (`toCalificacionEstudiante`).
 */
async function fetchCalificaciones(id: number, fecha?: string): Promise<CalificacionEstudiante[]> {
  const rows = await evalCol.getRows<CalificacionEstudiante | CalificacionRow>(
    calificacionesUrl(id, fecha),
  )
  if (env.ENABLE_API_MOCKING) return rows as CalificacionEstudiante[]
  return (rows as CalificacionRow[]).map(toCalificacionEstudiante)
}

/**
 * Mismo query que `useCalificacionesQuery`, como `queryOptions` — para la
 * Planilla, que necesita pedir las calificaciones de VARIAS actividades a la
 * vez con `useQueries` en vez de un solo `useQuery` por id.
 */
export function calificacionesQueryOptions(id: number, fecha?: string) {
  return queryOptions({
    queryKey: planeadorKeys.actividad.calificaciones(id, fecha),
    queryFn: () => fetchCalificaciones(id, fecha),
    staleTime: 1000 * 60,
  })
}

/** `fecha` (`yyyy-MM-dd`) es la que el backend cruza con la asistencia. Sin
 *  ella cae a `CURRENT_DATE` del servidor, que puede no ser el día de la
 *  actividad — y entonces la columna ASISTENCIA dice "sin registrar" aunque la
 *  asistencia esté tomada. */
export function useCalificacionesQuery(id: number | undefined, fecha?: string) {
  return useQuery({
    queryKey:
      id !== undefined
        ? planeadorKeys.actividad.calificaciones(id, fecha)
        : planeadorKeys.actividad.calificaciones("none"),
    queryFn: () => fetchCalificaciones(id!, fecha),
    enabled: id !== undefined,
    staleTime: 1000 * 60,
  })
}

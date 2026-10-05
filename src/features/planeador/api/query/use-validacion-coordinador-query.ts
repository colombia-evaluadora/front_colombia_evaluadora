import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

/**
 * Validación de la PLANEACIÓN de una actividad por el Coordinador de su sede
 * (`REQUIERE_VALIDACION_COORDINADOR = S`, sso V531.x). No confundir con las
 * aprobaciones de cambios de nota/asistencia (`/aprobaciones/...`, V496.18):
 * acá hay una sola decisión vigente por actividad.
 *
 * `GET /planeador/actividades/:ID/validacion-coordinador` → una fila con una
 * sola columna `resultado` (JSONB). `puedeValidar` lo decide el backend con
 * el mismo gate que el POST: Coordinador de la SEDE de la actividad (o
 * Rector/Jefe de sistema/Auxiliar administrativo de su establecimiento) y que
 * no sea quien la planeó. El front no repite esa regla: un coordinador de
 * otra sede simplemente recibe `puedeValidar: false`.
 */
export type EstadoValidacionCoordinador = "NO_REQUIERE" | "PENDIENTE" | "APROBADA" | "DECLINADA"

export interface ValidacionCoordinador {
  requiereValidacion: boolean
  estado: EstadoValidacionCoordinador
  observacion: string | null
  validadoPor: string | null
  fechaValidacion: string | null
  puedeValidar: boolean
}

export interface ValidacionCoordinadorRow {
  resultado: {
    pkActividad: number
    requiereValidacion: boolean
    estado: EstadoValidacionCoordinador
    observacion: string | null
    validadoPor: string | null
    fechaValidacion: string | null
    puedeValidar?: boolean
  }
}

export const toValidacionCoordinador = (row: ValidacionCoordinadorRow): ValidacionCoordinador => ({
  requiereValidacion: Boolean(row.resultado?.requiereValidacion),
  estado: row.resultado?.estado ?? "NO_REQUIERE",
  observacion: row.resultado?.observacion ?? null,
  validadoPor: row.resultado?.validadoPor ?? null,
  fechaValidacion: row.resultado?.fechaValidacion ?? null,
  puedeValidar: Boolean(row.resultado?.puedeValidar),
})

async function fetchValidacionCoordinador(actividadId: number): Promise<ValidacionCoordinador> {
  const [row] = await evalCol.getRows<ValidacionCoordinadorRow>(
    `/planeador/actividades/${actividadId}/validacion-coordinador`,
  )
  if (!row) throw new Error("La respuesta de la validación del coordinador no trajo datos.")
  return toValidacionCoordinador(row)
}

/**
 * `requiereValidacion` viene del detalle ya cargado: si la actividad no la
 * requiere no hay nada que pedir.
 */
export function useValidacionCoordinadorQuery(actividadId: number | undefined, requiereValidacion: boolean) {
  return useQuery({
    queryKey: planeadorKeys.actividad.validacionCoordinador(actividadId ?? "none"),
    queryFn: () => fetchValidacionCoordinador(actividadId as number),
    enabled: Boolean(actividadId) && requiereValidacion,
  })
}

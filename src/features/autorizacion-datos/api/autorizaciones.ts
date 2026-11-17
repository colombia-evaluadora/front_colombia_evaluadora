import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { inscripcionesKeys } from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"

import { autorizacionDatosKeys } from "@/features/autorizacion-datos/api/query-keys"
import type {
  AutorizacionEstablecimiento,
  AutorizacionPendiente,
} from "@/features/autorizacion-datos/api/types"
import { toAutorizaciones, toAutorizacionPendiente } from "@/features/autorizacion-datos/lib/autorizaciones"

const INSCRIPCIONES = "/cobertura-academica/inscripciones"

/** Mi cuenta: inscripciones del usuario como acudiente y, si aplica, su fila de funcionario. */
async function fetchAutorizacionesPendientes(): Promise<AutorizacionPendiente[]> {
  const rows = await evalCol.getRows<Record<string, unknown>>(`${INSCRIPCIONES}/autorizaciones-pendientes`)
  return rows.map(toAutorizacionPendiente).filter((p) => p.establecimientos.some((e) => !e.autorizado))
}

export function useAutorizacionesPendientesQuery() {
  return useQuery({ queryKey: autorizacionDatosKeys.pendientes, queryFn: fetchAutorizacionesPendientes })
}

export interface AutorizarVariables {
  pendiente: AutorizacionPendiente
  establecimientos: number[]
}

/**
 * Autoriza desde Mi cuenta: la inscripción por `POST /inscripciones/:ID/autorizar` (Regla 81) y el
 * funcionario por `POST /usuarios/mi-autorizacion-datos` (Regla 116). Devuelve cómo quedaron
 * los establecimientos de la fila.
 */
async function autorizar({ pendiente, establecimientos }: AutorizarVariables): Promise<AutorizacionEstablecimiento[]> {
  const body = { ESTABLECIMIENTOS: establecimientos }
  if (pendiente.tipo === "FUNCIONARIO") {
    await evalCol.postRow<{ datos: { autorizados: number; pendientes: unknown } }>("/usuarios/mi-autorizacion-datos", body)
    return pendiente.establecimientos.map((e) =>
      establecimientos.includes(e.establecimientoId) ? { ...e, autorizado: true } : e,
    )
  }
  const row = await evalCol.postRow<{ datos: unknown }>(`${INSCRIPCIONES}/${pendiente.inscripcionId}/autorizar`, body)
  return toAutorizaciones(row.datos)
}

export function useAutorizarDatos() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: autorizar,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: autorizacionDatosKeys.all })
      // La lista y el detalle de inscripciones dejan de estar restringidos para ese establecimiento.
      void queryClient.invalidateQueries({ queryKey: inscripcionesKeys.all })
    },
  })
}

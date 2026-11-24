import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { desenvolver, queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { configuracionKeys } from "@/features/gestion-estudiantil/configuracion/api/query-keys"
import type { CausasReservadas, ParametrosServicioSocialConfig } from "@/features/gestion-estudiantil/configuracion/api/types"

export const fetchCausasReservadas = (establecimiento: number | null) =>
  evalCol
    .getRows<Record<string, unknown>>(
      `/gestion-estudiantil/prevencion/parametros/causas-reservadas${queryString({ ESTABLECIMIENTO: establecimiento })}`,
    )
    .then((r) => desenvolver<CausasReservadas>(r[0], "datos", "No se encontraron las causas reservadas."))

/** `GET /prevencion/parametros/causas-reservadas` (V698) → columna `datos`. */
export function useCausasReservadasQuery(establecimiento: number | null) {
  return useQuery({
    queryKey: configuracionKeys.causasReservadas(establecimiento ?? "none"),
    queryFn: () => fetchCausasReservadas(establecimiento),
    enabled: establecimiento != null,
    retry: false,
  })
}

export const fetchServicioSocialConfig = (establecimiento: number | null) =>
  evalCol
    .getRows<Record<string, unknown>>(
      `/gestion-estudiantil/servicio-social/parametros${queryString({ ESTABLECIMIENTO: establecimiento })}`,
    )
    .then((r) => desenvolver<ParametrosServicioSocialConfig>(r[0], "datos", "No se encontraron los parámetros."))

/**
 * `GET /servicio-social/parametros` (V623) del establecimiento elegido. El hook de Actividades extracurriculares
 * no pasa ESTABLECIMIENTO y solo lee los grados; aquí hacen falta las horas y la anticipación.
 */
export function useServicioSocialConfigQuery(establecimiento: number | null) {
  return useQuery({
    queryKey: configuracionKeys.servicioSocial(establecimiento ?? "none"),
    queryFn: () => fetchServicioSocialConfig(establecimiento),
    enabled: establecimiento != null,
    retry: false,
  })
}

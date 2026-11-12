import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { prevencionKeys } from "@/features/gestion-estudiantil/prevencion/api/query-keys"
import { BASE_PREVENCION } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import type {
  AccesoPrevencion,
  IndicadorGestionRow,
  IndicadorRow,
  IndicadoresQueryFilters,
  ParametrosRiesgo,
} from "@/features/gestion-estudiantil/prevencion/api/types"

/** `GET /parametros`: lo lee quien tiene `puede_parametros` (la pestaña no se muestra a los demás). */
export function useParametrosQuery(establecimiento: number | null, enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.parametros(establecimiento ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<ParametrosRiesgo>(`${BASE_PREVENCION}/parametros${queryString({ ESTABLECIMIENTO: establecimiento })}`)
        .then((r) => r[0] ?? null),
    enabled: enabled && establecimiento != null,
    retry: false,
    staleTime: 60_000,
  })
}

/** `GET /indicadores`: una fila RESUMEN y una por grupo del agrupamiento pedido. */
export function useIndicadoresQuery(filters: IndicadoresQueryFilters | null) {
  return useQuery({
    queryKey: prevencionKeys.indicadores(filters),
    queryFn: () => evalCol.getRows<IndicadorRow>(`${BASE_PREVENCION}/indicadores${queryString({ ...filters })}`),
    enabled: filters != null,
    placeholderData: (prev) => prev,
  })
}

/** `GET /acceso`: qué ve quien consulta (pestañas Indicadores, Parámetros y Salud mental, IE-01, nuevo reporte). */
export function useAccesoPrevencionQuery(establecimiento: number | null) {
  return useQuery({
    queryKey: prevencionKeys.acceso(establecimiento ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<AccesoPrevencion>(`${BASE_PREVENCION}/acceso${queryString({ ESTABLECIMIENTO: establecimiento })}`)
        .then((r) => r[0] ?? null),
    staleTime: 60_000,
  })
}

export interface IndicadoresGestionParams {
  establecimiento: number | null
  desde?: string | null
  hasta?: string | null
}

/** `GET /indicadores/gestion` (IE-01): se pide solo con `puede_indicadores_gestion`. */
export function useIndicadoresGestionQuery(params: IndicadoresGestionParams, enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.indicadoresGestion(params),
    queryFn: () =>
      evalCol.getRows<IndicadorGestionRow>(
        `${BASE_PREVENCION}/indicadores/gestion${queryString({
          ESTABLECIMIENTO: params.establecimiento,
          DESDE: params.desde,
          HASTA: params.hasta,
        })}`,
      ),
    enabled: enabled && params.establecimiento != null,
    retry: false,
  })
}

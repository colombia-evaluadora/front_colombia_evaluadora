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

export const fetchParametrosRiesgo = (establecimiento: number | null) =>
  evalCol
    .getRows<ParametrosRiesgo>(`${BASE_PREVENCION}/parametros${queryString({ ESTABLECIMIENTO: establecimiento })}`)
    .then((r) => r[0] ?? null)

/** `GET /parametros`: lo usa la pestaña Parámetros de riesgo de Configuración (CONFIGURACION_GE/VER). */
export function useParametrosQuery(establecimiento: number | null, enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.parametros(establecimiento ?? "none"),
    queryFn: () => fetchParametrosRiesgo(establecimiento),
    enabled: enabled && establecimiento != null,
    retry: false,
    staleTime: 60_000,
  })
}

export const fetchIndicadores = (filters: IndicadoresQueryFilters | null) =>
  evalCol.getRows<IndicadorRow>(`${BASE_PREVENCION}/indicadores${queryString({ ...filters })}`)

/** `GET /indicadores`: una fila RESUMEN y una por grupo del agrupamiento pedido. */
export function useIndicadoresQuery(filters: IndicadoresQueryFilters | null) {
  return useQuery({
    queryKey: prevencionKeys.indicadores(filters),
    queryFn: () => fetchIndicadores(filters),
    enabled: filters != null,
    placeholderData: (prev) => prev,
  })
}

export const fetchAccesoPrevencion = (establecimiento: number | null) =>
  evalCol
    .getRows<AccesoPrevencion>(`${BASE_PREVENCION}/acceso${queryString({ ESTABLECIMIENTO: establecimiento })}`)
    .then((r) => r[0] ?? null)

/** `GET /acceso`: qué ve quien consulta (pestañas Indicadores, Parámetros y Salud mental, IE-01, nuevo reporte). */
export function useAccesoPrevencionQuery(establecimiento: number | null) {
  return useQuery({
    queryKey: prevencionKeys.acceso(establecimiento ?? "none"),
    queryFn: () => fetchAccesoPrevencion(establecimiento),
    staleTime: 60_000,
  })
}

export interface IndicadoresGestionParams {
  establecimiento: number | null
  desde?: string | null
  hasta?: string | null
}

export const fetchIndicadoresGestion = (params: IndicadoresGestionParams) =>
  evalCol.getRows<IndicadorGestionRow>(
    `${BASE_PREVENCION}/indicadores/gestion${queryString({
      ESTABLECIMIENTO: params.establecimiento,
      DESDE: params.desde,
      HASTA: params.hasta,
    })}`,
  )

/** `GET /indicadores/gestion` (IE-01): se pide solo con `puede_indicadores_gestion`. */
export function useIndicadoresGestionQuery(params: IndicadoresGestionParams, enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.indicadoresGestion(params),
    queryFn: () => fetchIndicadoresGestion(params),
    enabled: enabled && params.establecimiento != null,
    retry: false,
  })
}

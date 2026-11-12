import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { prevencionKeys } from "@/features/gestion-estudiantil/prevencion/api/query-keys"
import { BASE_PREVENCION } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import type {
  IndicadorGestionRow,
  IndicadorRow,
  IndicadoresQueryFilters,
  ParametrosRiesgo,
} from "@/features/gestion-estudiantil/prevencion/api/types"

/**
 * `GET /parametros`: solo el Rector lo lee; el resto recibe 403, y con eso la pestaña «Parámetros de
 * riesgo» no se muestra. Sin reintentos: un 403 no se arregla repitiendo.
 */
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

/**
 * Sondeo de acceso a la pestaña «Indicadores»: `GET /indicadores` con los filtros por defecto. Solo Rector,
 * Coordinador y Orientación lo leen; a los demás (Docente) les responde 403 y la pestaña no se muestra.
 */
export function useIndicadoresAccesoQuery(establecimiento: number | null) {
  return useQuery({
    queryKey: prevencionKeys.indicadores({ acceso: true, ESTABLECIMIENTO: establecimiento }),
    queryFn: () => evalCol.getRows<IndicadorRow>(`${BASE_PREVENCION}/indicadores${queryString({ ESTABLECIMIENTO: establecimiento })}`),
    enabled: establecimiento != null,
    retry: false,
    staleTime: 60_000,
  })
}

export interface IndicadoresGestionParams {
  establecimiento: number | null
  desde?: string | null
  hasta?: string | null
}

/** `GET /indicadores/gestion` (IE-01): solo Rector y Coordinador; el resto recibe 403 y no se muestra. */
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

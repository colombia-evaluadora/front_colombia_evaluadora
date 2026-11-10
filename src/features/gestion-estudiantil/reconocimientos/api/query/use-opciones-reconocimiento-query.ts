import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { reconocimientosKeys } from "@/features/gestion-estudiantil/reconocimientos/api/query-keys"
import { BASE_RECONOCIMIENTOS } from "@/features/gestion-estudiantil/reconocimientos/api/query/use-reconocimientos-query"
import type {
  ActividadOpcion,
  OpcionEstudianteReconocimiento,
  OpcionOtorganteReconocimiento,
} from "@/features/gestion-estudiantil/reconocimientos/api/types"

export interface OpcionesEstudiantesParams {
  establecimiento: number | null
  sede?: number | null
  jornada?: number | null
  grupo?: number | null
  search?: string
}

/** `GET /reconocimientos/opciones/estudiantes` (hasta 50; el texto va al servidor). */
export function useOpcionesEstudiantesQuery(params: OpcionesEstudiantesParams, enabled = true) {
  return useQuery({
    queryKey: reconocimientosKeys.opciones.estudiantes(params),
    queryFn: () =>
      evalCol.getRows<OpcionEstudianteReconocimiento>(
        `${BASE_RECONOCIMIENTOS}/opciones/estudiantes${queryString({
          ESTABLECIMIENTO: params.establecimiento,
          SEDE: params.sede,
          JORNADA: params.jornada,
          GRUPO: params.grupo,
          SEARCH: params.search?.trim() || null,
          PAGESIZE: 50,
        })}`,
      ),
    enabled: enabled && params.establecimiento != null,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

export interface OpcionesOtorgantesParams {
  establecimiento: number | null
  search?: string
}

/** `GET /reconocimientos/opciones/otorgantes`: la fila con `es_usuario_actual` es el valor por defecto. */
export function useOpcionesOtorgantesQuery(params: OpcionesOtorgantesParams, enabled = true) {
  return useQuery({
    queryKey: reconocimientosKeys.opciones.otorgantes(params),
    queryFn: () =>
      evalCol.getRows<OpcionOtorganteReconocimiento>(
        `${BASE_RECONOCIMIENTOS}/opciones/otorgantes${queryString({
          ESTABLECIMIENTO: params.establecimiento,
          SEARCH: params.search?.trim() || null,
          PAGESIZE: 50,
        })}`,
      ),
    enabled: enabled && params.establecimiento != null,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

export interface ActividadesParams {
  search?: string
}

/**
 * `GET /gestion-estudiantil/actividades?SEARCH=`: selector «Actividad relacionada». No hay opciones
 * dedicadas; se reutiliza el listado de actividades. `PERIODO` de ese endpoint es el período ACADÉMICO y
 * el alcance ya lo aplica el backend, así que no se manda.
 */
export function useActividadesOpcionesQuery(params: ActividadesParams, enabled = true) {
  return useQuery({
    queryKey: reconocimientosKeys.actividades(params),
    queryFn: () =>
      evalCol.getRows<ActividadOpcion>(
        `/gestion-estudiantil/actividades${queryString({ SEARCH: params.search?.trim() || null })}`,
      ),
    enabled,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

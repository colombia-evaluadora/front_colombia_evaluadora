import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { informeGrupoQueryKeyPrefix } from "@/features/academic-management/reports/api/query/use-informe-grupo-query"

interface UltimaActualizacionRow {
  fk_tmatricula: number
  fk_tperiodo_evaluacion: number
  /** Con zona (`TIMESTAMPTZ`): `new Date()` la deja en la hora local. */
  ultima_actualizacion: string
}

export interface UltimaActualizacionParams {
  grupoId: number
  periodos: number[]
}

/** La clave cuelga del prefijo del listado del grupo: todo guardado de
 *  informes (consolidar, planilla, observaciones, IA) ya lo invalida, así que
 *  la columna se refresca sola. */
export const ultimaActualizacionQueryKey = (params: UltimaActualizacionParams) =>
  [...informeGrupoQueryKeyPrefix(), "ultima-actualizacion", params] as const

export function ultimaActualizacionKey(matriculaId: number, periodoId: number): string {
  return `${matriculaId}:${periodoId}`
}

/**
 * `POST /informes/ultima-actualizacion` (sso V536/V537/V539): la fecha del
 * último guardado de cada (estudiante, período) del grupo —su consolidación,
 * la misma fuente que el historial, o el guardado de su observación (registro
 * narrativo de preescolar), lo más reciente—. En el Final, el comentario del
 * año o la definitiva guardada. Sin ningún guardado no viene: celda vacía.
 * Devuelve un mapa por `ultimaActualizacionKey`.
 */
export function useUltimaActualizacionQuery(params: UltimaActualizacionParams | null) {
  return useQuery({
    // Dato accesorio de la tabla (fecha del último guardado): sin red y sin
    // copia, la pantalla igual muestra el informe guardado.
    meta: { offlineOptional: true },
    queryKey: params
      ? ultimaActualizacionQueryKey(params)
      : ([...informeGrupoQueryKeyPrefix(), "ultima-actualizacion", "none"] as const),
    queryFn: async () => {
      const rows = await evalCol.postRows<UltimaActualizacionRow>("/informes/ultima-actualizacion", {
        FK_TGRUPO: params!.grupoId,
        PERIODOS: params!.periodos,
      })
      return new Map(
        rows.map((r) => [
          ultimaActualizacionKey(r.fk_tmatricula, r.fk_tperiodo_evaluacion),
          r.ultima_actualizacion,
        ]),
      )
    },
    enabled: params != null,
    placeholderData: (prev) => prev,
  })
}

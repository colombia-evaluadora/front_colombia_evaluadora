import { evalCol } from "@/lib/eval-col-client"

import { desenvolver } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { BASE_OBSERVACIONES } from "@/features/gestion-estudiantil/observaciones/api/query/use-observaciones-query"
import {
  useObservacionesMutation,
  type MutationCfg,
} from "@/features/gestion-estudiantil/observaciones/api/mutations/use-observaciones-mutation"
import type {
  CrearObservacionInput,
  ResultadoCrearObservacion,
} from "@/features/gestion-estudiantil/observaciones/api/types"

/**
 * `POST /observaciones-sugerencias`: un registro por grupo (Todo el grupo, Regla 34) o por estudiante
 * (Estudiantes específicos). Devuelve en `datos` los ids y a cuántos estudiantes aplica.
 */
const crearObservacion = (input: CrearObservacionInput) =>
  evalCol
    .postRows<Record<string, unknown>>(BASE_OBSERVACIONES, input)
    .then((r) => desenvolver<ResultadoCrearObservacion>(r[0], "datos", "No se pudo guardar la observación."))

export const useCrearObservacion = ({ mutationConfig }: MutationCfg<typeof crearObservacion> = {}) =>
  useObservacionesMutation(crearObservacion, mutationConfig)

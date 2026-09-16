import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { informeGrupoQueryKeyPrefix } from "@/features/academic-management/reports/api/query/use-informe-grupo-query"

export interface GuardarObservacionInput {
  matriculaId: number
  periodoId: number
  observacion: string
}

/** `POST /informes/observacion/guardar`. El estado se deduce comparando el
 *  texto contra `OBSERVACION_IA`; como la generación con IA quedó fuera de
 *  alcance, no se manda y el backend marca `APROBADA`. */
async function guardarObservacion(input: GuardarObservacionInput): Promise<void> {
  await evalCol.postRows("/informes/observacion/guardar", {
    FK_TMATRICULA: input.matriculaId,
    FK_TPERIODO_EVALUACION: input.periodoId,
    OBSERVACION: input.observacion,
  })
}

export interface EliminarObservacionInput {
  matriculaId: number
  periodoId: number
}

/** `POST /informes/observacion/eliminar`. Borrado físico: el índice único es
 *  total sobre (matrícula, período) y una fila inactiva impediría guardar
 *  una nueva. Llamarlo dos veces responde 404. */
async function eliminarObservacion(input: EliminarObservacionInput): Promise<void> {
  await evalCol.postRows("/informes/observacion/eliminar", {
    FK_TMATRICULA: input.matriculaId,
    FK_TPERIODO_EVALUACION: input.periodoId,
  })
}

export function useGuardarObservacionMutation({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof guardarObservacion> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: guardarObservacion,
    onSuccess: (result, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: informeGrupoQueryKeyPrefix() })
      onSuccess?.(result, variables, ...rest)
    },
    ...restConfig,
  })
}

export function useEliminarObservacionMutation({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof eliminarObservacion> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: eliminarObservacion,
    onSuccess: (result, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: informeGrupoQueryKeyPrefix() })
      onSuccess?.(result, variables, ...rest)
    },
    ...restConfig,
  })
}

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { informeGrupoQueryKeyPrefix } from "@/features/academic-management/reports/api/query/use-informe-grupo-query"

export interface ObservacionGenerada {
  texto: string
  /** Cuántas observaciones del docente resumió. Se reenvía al guardar: el
   *  backend lo compara contra cuántas hay hoy para marcar
   *  `observacion_desactualizada`. */
  observacionesOrigen: number
}

interface GenerarRow {
  observacion_ia: string | null
  observaciones_origen: number | null
}

export interface GenerarObservacionInput {
  matriculaId: number
  periodoId: number
}

/** `POST /informes/observacion/generar`. No escribe nada, así que se puede
 *  llamar las veces que haga falta. La IA está simulada del lado del backend
 *  —concatena las observaciones por actividad— pero el contrato ya es el
 *  definitivo: cuando llegue el modelo, acá no cambia nada. */
async function generarObservacion(input: GenerarObservacionInput): Promise<ObservacionGenerada> {
  const rows = await evalCol.postRows<GenerarRow>("/informes/observacion/generar", {
    FK_TMATRICULA: input.matriculaId,
    FK_TPERIODO_EVALUACION: input.periodoId,
  })
  return {
    texto: rows[0]?.observacion_ia ?? "",
    observacionesOrigen: rows[0]?.observaciones_origen ?? 0,
  }
}

export interface GuardarObservacionInput {
  matriculaId: number
  periodoId: number
  observacion: string
  /** El borrador tal como llegó de `generar`. Sin esto el backend no puede
   *  distinguir "guardé sin editar" de "edité", y marca `APROBADA`. Va
   *  ausente —no vacío— cuando el docente escribió a mano. */
  observacionIa?: string
  observacionesOrigen?: number
}

/** `POST /informes/observacion/guardar`. El estado sale de comparar el texto
 *  contra `OBSERVACION_IA`: iguales → `APROBADA`, distintos → `MODIFICADA`. */
async function guardarObservacion(input: GuardarObservacionInput): Promise<void> {
  await evalCol.postRows("/informes/observacion/guardar", {
    FK_TMATRICULA: input.matriculaId,
    FK_TPERIODO_EVALUACION: input.periodoId,
    OBSERVACION: input.observacion,
    ...(input.observacionIa != null && { OBSERVACION_IA: input.observacionIa }),
    ...(input.observacionesOrigen != null && {
      OBSERVACIONES_ORIGEN: input.observacionesOrigen,
    }),
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

export function useGenerarObservacionMutation({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof generarObservacion> } = {}) {
  return useMutation({ mutationFn: generarObservacion, ...mutationConfig })
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

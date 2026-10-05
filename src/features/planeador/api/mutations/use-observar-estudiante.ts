import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

export interface ObservarEstudianteInput {
  pkTactividadEstudiante: number
  observacion: string
  fecha: string
  evidencias?: number[]
  /** Regla 61: omitido no lo toca; vacío lo quita. */
  enlace?: string
  /** Nombre del momento (Inicio/Proceso/Cierre); omitido no lo toca. */
  momento?: string
}

function buildObservarBody(input: {
  observacion: string
  fecha: string
  evidencias?: number[]
  enlace?: string
  momento?: string
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    OBSERVACION: input.observacion,
    FECHA: input.fecha,
  }
  if (input.evidencias) body.EVIDENCIAS = input.evidencias
  if (input.enlace !== undefined) body.ENLACE = input.enlace
  if (input.momento) body.MOMENTO = input.momento
  return body
}

function observarEstudiante(input: ObservarEstudianteInput): Promise<void> {
  return evalCol.put(
    `/planeador/actividades/estudiantes/${input.pkTactividadEstudiante}/observar`,
    buildObservarBody(input),
  )
}

interface UseObservarEstudianteOptions {
  mutationConfig?: MutationConfig<typeof observarEstudiante>
}

export function useObservarEstudianteMutation({
  mutationConfig,
}: UseObservarEstudianteOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: observarEstudiante,
    onSuccess: (result, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: planeadorKeys.planilla.calificaciones.all })
      queryClient.invalidateQueries({
        queryKey: planeadorKeys.actividadEstudiante.nota(variables.pkTactividadEstudiante),
      })
      onSuccess?.(result, variables, ...rest)
    },
    ...restConfig,
  })
}

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { planillaCalificacionesQueryKeyPrefix } from "@/features/planeador/api/query/use-planilla-calificaciones-query"
import { notaEstudianteQueryKey } from "@/features/planeador/api/query/use-nota-estudiante-query"

export interface ObservarEstudianteInput {
  pkTactividadEstudiante: number
  observacion: string
  fecha: string
  evidencias?: number[]
}

function buildObservarBody(input: {
  observacion: string
  fecha: string
  evidencias?: number[]
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    OBSERVACION: input.observacion,
    FECHA: input.fecha,
  }
  if (input.evidencias) body.EVIDENCIAS = input.evidencias
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
      queryClient.invalidateQueries({ queryKey: planillaCalificacionesQueryKeyPrefix() })
      queryClient.invalidateQueries({
        queryKey: notaEstudianteQueryKey(variables.pkTactividadEstudiante),
      })
      onSuccess?.(result, variables, ...rest)
    },
    ...restConfig,
  })
}

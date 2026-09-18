import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { planillaCalificacionesQueryKeyPrefix } from "@/features/planeador/api/query/use-planilla-calificaciones-query"
import { notaEstudianteQueryKey } from "@/features/planeador/api/query/use-nota-estudiante-query"

/**
 * Observación de UN estudiante en una actividad de referente FORMATIVO
 * (`PUT /planeador/actividades/estudiantes/:id/observar`).
 *
 * Es el reemplazo de la nota, no un complemento: en una actividad formativa
 * `calificar` responde 22023 y el texto se guarda en `TACTIVIDAD_NOTA` con
 * `CALIFICACION = NULL` y `CALIFICABLE = 'N'`. Hay UNA sola observación viva
 * por estudiante-actividad, así que guardar pisa la anterior (incluida la que
 * dejó una observación grupal).
 *
 * Mismo gate de asistencia que calificar: la `fecha` tiene que ser un día con
 * asistencia válida del estudiante, que es justo lo que trae
 * `PlanillaCelda.fechaAsistencia`.
 */
export interface ObservarEstudianteInput {
  pkTactividadEstudiante: number
  observacion: string
  /** `yyyy-MM-dd` — `PlanillaCelda.fechaAsistencia`, no la fecha de la
   *  actividad. */
  fecha: string
  /** `PK_TARCHIVO` de imágenes ya subidas por el file-service. Semántica de
   *  reemplazo: omitir no toca las que hay, `[]` las quita. */
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

/**
 * Misma observación para TODOS los estudiantes asignados a la actividad
 * (`POST /planeador/actividades/:id/observar-grupal`).
 *
 * No recibe lista de estudiantes: el backend recorre el roster y **omite en
 * silencio** (no falla) a quien no tenga asistencia válida ese día — por eso
 * devuelve cuántos quedaron observados, que es el único dato que permite
 * avisar que no alcanzó a todos.
 */
export interface ObservarGrupalInput {
  actividadId: number
  observacion: string
  /** `yyyy-MM-dd` — una sola fecha para todo el grupo, a diferencia de la
   *  individual, que puede usar la de cada celda. */
  fecha: string
  evidencias?: number[]
}

async function observarGrupal(input: ObservarGrupalInput): Promise<{ observados: number | null }> {
  const row = await evalCol.postRow<Record<string, unknown>>(
    `/planeador/actividades/${input.actividadId}/observar-grupal`,
    buildObservarBody(input),
  )
  const observados = Object.values(row).find((value) => typeof value === "number")
  return { observados: typeof observados === "number" ? observados : null }
}

interface UseObservarGrupalOptions {
  mutationConfig?: MutationConfig<typeof observarGrupal>
}

export function useObservarGrupalMutation({ mutationConfig }: UseObservarGrupalOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: observarGrupal,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: planillaCalificacionesQueryKeyPrefix() })
      queryClient.invalidateQueries({ queryKey: ["planeador", "actividad-estudiante"] })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}

import { outboxHeaders } from "@/lib/offline/outbox/headers"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import { runOrQueue } from "@/lib/offline/outbox/engine"
import { registerOutboxHandler } from "@/lib/offline/outbox/registry"
import type { SendCtx } from "@/lib/offline/outbox/types"
import { planeadorKeys } from "@/features/planeador/api/query-keys"
import {
  invalidarCalificacionesActividad,
  refrescarBloqueoEdicion,
} from "@/features/planeador/api/mutations/invalidar-calificaciones"

export interface ObservarEstudianteInput {
  pkTactividadEstudiante: number
  /** Actividad de la celda: si se pasa, solo se invalidan sus calificaciones
   *  (X2); si no, las de todas las actividades en cache. */
  actividadId?: number
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

interface ObservarPayload {
  pkTactividadEstudiante: number
  actividadId?: number
  body: Record<string, unknown>
  /** `updated_at` de la celda que vio el docente (CAS, BE-2). */
  baseVersion?: string | null
}

registerOutboxHandler<ObservarPayload>({
  kind: "planilla.observacion",
  version: 1,
  entityKey: (p) => `planilla:act-est:${p.pkTactividadEstudiante}`,
  coalesce: (prev, next) => ({
    ...next,
    body: { ...prev.body, ...next.body },
    baseVersion: prev.baseVersion ?? next.baseVersion,
  }),
  send: (p: ObservarPayload, ctx: SendCtx) =>
    evalCol.put(
      `/planeador/actividades/estudiantes/${p.pkTactividadEstudiante}/observar`,
      { ...p.body, ...(p.baseVersion ? { BASE_VERSION: p.baseVersion } : {}) },
      { headers: outboxHeaders(ctx), background: ctx.background },
    ),
  invalidates: (p) => [
    planeadorKeys.planilla.calificaciones.all,
    planeadorKeys.actividadEstudiante.nota(p.pkTactividadEstudiante),
    // El detalle (y lo que cuelga) trae el bloqueo de la Regla 37; los listados, el lápiz.
    p.actividadId != null ? planeadorKeys.actividad.detalle(p.actividadId) : planeadorKeys.actividad.all,
    planeadorKeys.actividades.all,
    // La observación cuenta como "ya calificó" en la alerta de planillas
    // pendientes de Informes (preescolar no pone notas): igual que calificar-celda.
    ["informes"],
  ],
  rebase: (p, conflict) => ({ ...p, baseVersion: conflict.serverVersion ?? null }),
  describe: (p) => ({
    titulo: "Observación",
    detalle: String(p.body.OBSERVACION ?? "").slice(0, 80),
    ruta: "/app/planeador/planilla",
  }),
})

async function observarEstudiante(
  input: ObservarEstudianteInput & { baseVersion?: string | null },
): Promise<{ queued: boolean }> {
  const payload: ObservarPayload = {
    pkTactividadEstudiante: input.pkTactividadEstudiante,
    actividadId: input.actividadId,
    body: buildObservarBody(input),
    baseVersion: input.baseVersion ?? null,
  }
  const outcome = await runOrQueue("planilla.observacion", payload)
  return { queued: outcome.queued }
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
    networkMode: "always",
    onSuccess: (result, variables, ...rest) => {
      if (result.queued) {
        onSuccess?.(result, variables, ...rest)
        return
      }
      queryClient.invalidateQueries({ queryKey: planeadorKeys.planilla.calificaciones.all })
      queryClient.invalidateQueries({
        queryKey: planeadorKeys.actividadEstudiante.nota(variables.pkTactividadEstudiante),
      })
      invalidarCalificacionesActividad(queryClient, variables.actividadId)
      // Regla 37: el primer resultado bloquea la edición (lápiz, panel, edición).
      refrescarBloqueoEdicion(queryClient, variables.actividadId)
      // Alertas de Informes: una observación saca la planilla de "pendientes".
      queryClient.invalidateQueries({ queryKey: ["informes"] })
      onSuccess?.(result, variables, ...rest)
    },
    ...restConfig,
  })
}

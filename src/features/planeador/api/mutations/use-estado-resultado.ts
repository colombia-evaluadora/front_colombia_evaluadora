import { outboxHeaders } from "@/lib/offline/outbox/headers"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import { runOrQueue } from "@/lib/offline/outbox/engine"
import { registerOutboxHandler } from "@/lib/offline/outbox/registry"
import type { SendCtx } from "@/lib/offline/outbox/types"
import { planeadorKeys } from "@/features/planeador/api/query-keys"
import { refrescarBloqueoEdicion } from "@/features/planeador/api/mutations/invalidar-calificaciones"

/**
 * Regla 62: marca No presentó o lo quita (vuelve a Pendiente):
 * `PUT /planeador/actividades/estudiantes/:ID/estado-resultado`.
 * No presentó exige que no haya nota; No asistido no se marca a mano.
 */
export interface EstadoResultadoInput {
  actividadId: number
  /** `PK_TACTIVIDAD_ESTUDIANTE`. */
  pkTactividadEstudiante: number
  estado: "NO_PRESENTO" | "PENDIENTE"
}

registerOutboxHandler<EstadoResultadoInput>({
  kind: "planilla.estado-resultado",
  version: 1,
  entityKey: (p) => `planilla:act-est:${p.pkTactividadEstudiante}`,
  coalesce: (_prev, next) => next,
  send: (input: EstadoResultadoInput, ctx: SendCtx) =>
    evalCol.putRow(
      `/planeador/actividades/estudiantes/${input.pkTactividadEstudiante}/estado-resultado`,
      { ESTADO: input.estado },
      { headers: outboxHeaders(ctx), background: ctx.background },
    ),
  // El detalle (y lo que cuelga) trae el bloqueo de la Regla 37 —"No
  // presentó" cuenta como resultado—; los listados, el lápiz.
  invalidates: (p) => [
    planeadorKeys.actividad.detalle(p.actividadId),
    planeadorKeys.planilla.calificaciones.all,
    planeadorKeys.actividades.all,
  ],
  describe: (p) => ({
    titulo: p.estado === "NO_PRESENTO" ? "Marcar No presentó" : "Quitar No presentó",
    detalle: `Actividad ${p.actividadId}`,
    ruta: "/app/planeador/actividades",
  }),
})

async function marcarEstadoResultado(input: EstadoResultadoInput): Promise<{ queued: boolean }> {
  const outcome = await runOrQueue("planilla.estado-resultado", input)
  return { queued: outcome.queued }
}

export function useEstadoResultadoMutation(
  options: { mutationConfig?: MutationConfig<typeof marcarEstadoResultado> } = {},
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: marcarEstadoResultado,
    networkMode: "always",
    ...options.mutationConfig,
    onSuccess: (...args) => {
      const [, input] = args
      queryClient.invalidateQueries({ queryKey: planeadorKeys.actividad.calificaciones(input.actividadId) })
      queryClient.invalidateQueries({ queryKey: planeadorKeys.planilla.calificaciones.all })
      // Regla 37: "No presentó" bloquea la edición como una nota.
      refrescarBloqueoEdicion(queryClient, input.actividadId)
      options.mutationConfig?.onSuccess?.(...args)
    },
  })
}

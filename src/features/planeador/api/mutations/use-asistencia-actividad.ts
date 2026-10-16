import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import { runOrQueue } from "@/lib/offline/outbox/engine"
import { registerOutboxHandler } from "@/lib/offline/outbox/registry"
import type { SendCtx } from "@/lib/offline/outbox/types"
import { planeadorKeys } from "@/features/planeador/api/query-keys"
import type { TipoAsistencia } from "@/features/academic-management/asistencia/api/types/asistencia"

import { invalidarPlaneadorPorAsistencia } from "@/features/planeador/api/query/invalidar-por-asistencia"

/**
 * Asistencia de UN estudiante en la actividad, marcada desde la tabla de
 * calificaciones: `PUT /planeador/actividades/estudiantes/:ID/asistencia`.
 * Nunca toca la de la Vista Asistencias; sin Vista ese día, el backend
 * recalcula la asistencia oficial con las marcas de todas las actividades.
 * 400 si ya tiene resultado (congelada) o la actividad no empieza.
 */
export interface AsistenciaActividadInput {
  /** `PK_TACTIVIDAD_ESTUDIANTE`. */
  pkTactividadEstudiante: number
  tipo: Extract<TipoAsistencia, 1 | 2 | 5>
}

registerOutboxHandler<AsistenciaActividadInput>({
  kind: "actividad.asistencia",
  version: 1,
  entityKey: (p) => `planilla:act-est:${p.pkTactividadEstudiante}`,
  coalesce: (_prev, next) => next,
  send: (input: AsistenciaActividadInput, ctx: SendCtx) =>
    evalCol.putRow(
      `/planeador/actividades/estudiantes/${input.pkTactividadEstudiante}/asistencia`,
      { TIPO_ASISTENCIA: input.tipo },
      { headers: { "Idempotency-Key": ctx.idempotencyKey }, background: ctx.background },
    ),
  invalidates: () => [planeadorKeys.planilla.calificaciones.all, ["planeador", "actividad"], ["asistencia"]],
  describe: () => ({ titulo: "Asistencia en la actividad", detalle: "", ruta: "/app/planeador/actividades" }),
})

async function marcarAsistenciaActividad(input: AsistenciaActividadInput): Promise<{ queued: boolean }> {
  const outcome = await runOrQueue("actividad.asistencia", input)
  return { queued: outcome.queued }
}

export function useAsistenciaActividadMutation(
  options: { mutationConfig?: MutationConfig<typeof marcarAsistenciaActividad> } = {},
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: marcarAsistenciaActividad,
    networkMode: "always",
    ...options.mutationConfig,
    onSuccess: (...args) => {
      // Puede cambiar la oficial del día: afecta otras actividades y Asistencia.
      invalidarPlaneadorPorAsistencia(queryClient)
      queryClient.invalidateQueries({ queryKey: ["asistencia"] })
      options.mutationConfig?.onSuccess?.(...args)
    },
  })
}

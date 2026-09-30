import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { calificacionesQueryKey } from "@/features/planeador/api/query/use-calificaciones-query"
import { planillaCalificacionesQueryKeyPrefix } from "@/features/planeador/api/query/use-planilla-calificaciones-query"

/**
 * Regla 62 — marca/desmarca "No Presentó" (asistió pero no entregó evidencia).
 *
 * CONTRATO PROPUESTO, todavía no existe en el backend (ver
 * `docs/planeador-pendientes-integracion.md`):
 * `PUT /planeador/actividades/estudiantes/:id/no-presento`
 * con `{ NO_PRESENTO: boolean, FECHA: "yyyy-MM-dd" }`. Al marcar, el backend
 * limpia la nota: los estados son excluyentes. Desmarcar deja la celda
 * en "Pendiente de calificar".
 */
export interface MarcarNoPresentoInput {
  actividadId: number
  /** `PK_TACTIVIDAD_ESTUDIANTE`. */
  pkTactividadEstudiante: number
  noPresento: boolean
  /** `yyyy-MM-dd` — mismo `FECHA` que al calificar (`fecha_asistencia`). */
  fecha: string
}

function marcarNoPresento(input: MarcarNoPresentoInput): Promise<unknown> {
  return evalCol.putRow(`/planeador/actividades/estudiantes/${input.pkTactividadEstudiante}/no-presento`, {
    NO_PRESENTO: input.noPresento,
    FECHA: input.fecha,
  })
}

export function useMarcarNoPresento(
  options: { mutationConfig?: MutationConfig<typeof marcarNoPresento> } = {},
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: marcarNoPresento,
    ...options.mutationConfig,
    onSuccess: (...args) => {
      const [, input] = args
      queryClient.invalidateQueries({ queryKey: calificacionesQueryKey(input.actividadId) })
      queryClient.invalidateQueries({ queryKey: planillaCalificacionesQueryKeyPrefix() })
      options.mutationConfig?.onSuccess?.(...args)
    },
  })
}

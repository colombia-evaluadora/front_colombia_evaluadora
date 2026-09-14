import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { actividadDetalleQueryKey } from "@/features/planeador/api/query/use-actividad-detalle-query"

interface AgregarCriterioInput {
  actividadId: number
  criterioUnidadId: number
}

/**
 * `POST /planeador/actividades/:id/criterios` (confirmado real, colección
 * Postman `planeador-guia-completa`, 4.9): relaciona un criterio de la
 * RÚBRICA DE LA UNIDAD (`TCRITERIO_UNIDAD`) con esta actividad puntual —
 * distinto de la rúbrica PROPIA de la actividad (`PUT .../instrumento`, ver
 * `update-instrumento-actividad.ts`). Exige que la actividad tenga
 * `FK_TUNIDAD` y que el criterio pertenezca a la rúbrica de esa misma
 * unidad.
 *
 * Existe también `PATCH /planeador/actividades/criterios/:id` (4.10) para
 * desvincular, pero pide el PK de la RELACIÓN (`PK_TACTIVIDAD_CRITERIO_
 * UNIDAD`), no el del criterio — igual que con evidencias
 * (`agregar-evidencia-actividad.ts`), no hay forma confirmada de saber qué
 * relaciones ya existían al abrir el detalle real, así que el checklist del
 * form solo AGREGA, nunca quita.
 */
function agregarCriterioUnidadActividad({
  actividadId,
  criterioUnidadId,
}: AgregarCriterioInput): Promise<unknown> {
  return api.post(`/eval-col/planeador/actividades/${actividadId}/criterios`, {
    FK_TCRITERIO_UNIDAD: criterioUnidadId,
  })
}

interface UseAgregarCriterioUnidadActividadOptions {
  mutationConfig?: MutationConfig<typeof agregarCriterioUnidadActividad>
}

export function useAgregarCriterioUnidadActividad({
  mutationConfig,
}: UseAgregarCriterioUnidadActividadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: agregarCriterioUnidadActividad,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: actividadDetalleQueryKey(variables.actividadId) })
      onSuccess?.(data, variables, ...rest)
    },
    ...restConfig,
  })
}

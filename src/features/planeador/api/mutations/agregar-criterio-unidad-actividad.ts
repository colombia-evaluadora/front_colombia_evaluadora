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
 * Único uso restante: el ALTA de una actividad
 * (`planeador-crear-actividad-page.tsx`), que llama esto una vez por cada
 * criterio marcado, DESPUÉS de crear la actividad (recién ahí existe
 * `actividadId`). Al EDITAR ya no hace falta: `values.criteriosUnidadIds`
 * viaja completo en el mismo `PUT /actividades/:id` como reemplazo total
 * (`update-actividad.ts`, sso V492), así que tildar y destildar funciona
 * igual que al crear.
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

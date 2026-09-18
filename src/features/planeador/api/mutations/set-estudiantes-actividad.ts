import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { actividadDetalleQueryKey } from "@/features/planeador/api/query/use-actividad-detalle-query"

interface SetEstudiantesInput {
  actividadId: number
  /** Mutuamente excluyentes, mismo contrato que `POST /planeador/actividades`
   *  (ver `create-actividad.ts`): matrículas puntuales, o todo el grupo. */
  matriculasIds: number[]
  asignarTodoElGrupo: boolean
}

/**
 * `PUT /planeador/actividades/:id/estudiantes` (`FK_TMATRICULAS[]`,
 * `ASIGNAR_TODO_EL_GRUPO`) — el endpoint SUELTO para fijar los estudiantes
 * de una actividad YA CREADA, documentado junto con evidencias/criterios/
 * materiales/adaptaciones como "cambios puntuales" (a diferencia de esos
 * otros, `update-actividad.ts` SÍ podía mandar `FK_TMATRICULAS` dentro del
 * `PUT` general — pero ese camino nunca manda `ASIGNAR_TODO_EL_GRUPO`, así
 * que no había forma de VOLVER una actividad a "todo el grupo" después de
 * haberla puntualizado. Este endpoint sí distingue los dos casos, igual
 * que el alta).
 *
 * Se llama aparte del `PUT` general, mismo criterio que
 * `useUpdateMaterialesActividad`/`useUpdateAdaptacionesActividad`.
 */
async function setEstudiantesActividad({
  actividadId,
  matriculasIds,
  asignarTodoElGrupo,
}: SetEstudiantesInput): Promise<unknown> {
  const body: Record<string, unknown> = {}
  if (asignarTodoElGrupo) {
    body.ASIGNAR_TODO_EL_GRUPO = true
  } else {
    body.FK_TMATRICULAS = matriculasIds
  }
  return api.put(`/eval-col/planeador/actividades/${actividadId}/estudiantes`, body)
}

interface UseSetEstudiantesActividadOptions {
  mutationConfig?: MutationConfig<typeof setEstudiantesActividad>
}

export function useSetEstudiantesActividad({ mutationConfig }: UseSetEstudiantesActividadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: setEstudiantesActividad,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: actividadDetalleQueryKey(variables.actividadId) })
      onSuccess?.(data, variables, ...rest)
    },
    ...restConfig,
  })
}

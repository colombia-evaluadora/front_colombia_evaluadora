import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { env } from "@/config/env"
import type { MutationConfig } from "@/lib/react-query"

import { actividadesQueryKey } from "@/features/planeador/api/query/use-actividades-query"
import { actividadDetalleQueryKey } from "@/features/planeador/api/query/use-actividad-detalle-query"
import { resolveTipoActividadId } from "@/features/planeador/api/query/use-tipo-actividad-catalog"
import type { Actividad } from "@/features/planeador/api/types/actividad"

interface UpdateActividadInput {
  actividadId: number
  data: Actividad
}

/**
 * `PUT /planeador/actividades/:id` (confirmado real) — igual que en unidad,
 * el PUT es parcial: campo ausente preserva el valor actual. Por eso
 * `FK_TGRUPO`/`FK_TASIGNATURA` solo se mandan si el docente re-eligió
 * grado/grupo/asignatura en este form (`gradoId`/`grupoId`/`asignaturaId`
 * resueltos) — si no los tocó, se omiten.
 *
 * No toca `FK_TUNIDAD`: reasignar la unidad de la actividad se resuelve
 * ANTES de llamar a este mutation, en `handleSubmit` de
 * `planeador-editar-actividad-page.tsx`, contra las rutas dedicadas
 * (`useLinkActividadUnidad`/`useUnlinkActividadUnidad`) — son las únicas que
 * conocen la `ponderacion` que exige esa unidad. Mandar `FK_TUNIDAD` acá
 * también duplicaba la escritura y el backend terminaba validando la
 * `PONDERACION` de esta actividad (el peso en la nota final, campo
 * distinto) contra la unidad recién vinculada, con 400 de por medio.
 *
 * Mismo alcance acotado que `create-actividad.ts` fuera de esto: no toca
 * materiales, adaptaciones, recuperación, evidencias ni criterios.
 */
async function updateActividad({ actividadId, data }: UpdateActividadInput): Promise<unknown> {
  if (env.ENABLE_API_MOCKING) {
    return api.put(`/eval-col/planeador/actividades/${actividadId}`, data)
  }
  const body: Record<string, unknown> = {
    TITULO: data.nombre,
    ES_EVALUATIVA: data.esEvaluativa ? "S" : "N",
    FECHA_INICIO: data.fechaInicio,
    FECHA_CIERRE: data.fechaCierre,
  }
  if (data.grupoId != null) body.FK_TGRUPO = data.grupoId
  if (data.asignaturaId != null) body.FK_TASIGNATURA = data.asignaturaId
  const tipoActividadId = await resolveTipoActividadId(data.tipo)
  if (tipoActividadId != null) body.FK_TLV_TIPO_ACTIVIDAD = tipoActividadId
  // Alternativos, no coexisten (ver el comentario de `Actividad.notaMaxima`
  // y el mismo branch en `create-actividad.ts`): `NOTA_MAXIMA` cuando la
  // unidad calcula por "Suma de puntos", `PONDERACION` cuando calcula por
  // "Ponderado" — el form ya deja cargado solo el que corresponde.
  if (data.esEvaluativa && data.notaMaxima != null) body.NOTA_MAXIMA = data.notaMaxima
  else if (data.esEvaluativa && data.ponderacion > 0) body.PONDERACION = data.ponderacion
  return api.put(`/eval-col/planeador/actividades/${actividadId}`, body)
}

interface UseUpdateActividadOptions {
  mutationConfig?: MutationConfig<typeof updateActividad>
}

export function useUpdateActividad({ mutationConfig }: UseUpdateActividadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: updateActividad,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: actividadDetalleQueryKey(variables.actividadId) })
      queryClient.invalidateQueries({ queryKey: actividadesQueryKey() })
      onSuccess?.(data, variables, ...rest)
    },
    ...restConfig,
  })
}

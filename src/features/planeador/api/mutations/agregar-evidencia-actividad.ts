import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { actividadDetalleQueryKey } from "@/features/planeador/api/query/use-actividad-detalle-query"

interface AgregarEvidenciaInput {
  actividadId: number
  evidenciaId: number
}

/**
 * `POST /planeador/actividades/:id/evidencias` (confirmado real, colección
 * Postman `planeador-guia-completa`, 4.11). Es el único camino confirmado
 * para agregar una evidencia a una actividad YA creada — no hay endpoint
 * confirmado para quitar una ya relacionada, así que no existe su opuesto
 * acá (ver el comentario de `Actividad.evidenciasIds`).
 *
 * La evidencia (nivel 2 de `TREFERENTE_ENUNCIADO`) viaja como
 * `FK_REFERENTE_ENUNCIADO` — NO `FK_TLV_EVIDENCIA`, que no es un campo real
 * del body (confirmado contra la captura de 4.11: el backend la rechazaba
 * en silencio con ese nombre, dejando el checkbox marcado en el front sin
 * relación real del lado del servidor).
 */
function agregarEvidenciaActividad({ actividadId, evidenciaId }: AgregarEvidenciaInput): Promise<unknown> {
  return api.post(`/eval-col/planeador/actividades/${actividadId}/evidencias`, {
    FK_REFERENTE_ENUNCIADO: evidenciaId,
  })
}

interface UseAgregarEvidenciaActividadOptions {
  mutationConfig?: MutationConfig<typeof agregarEvidenciaActividad>
}

export function useAgregarEvidenciaActividad({ mutationConfig }: UseAgregarEvidenciaActividadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: agregarEvidenciaActividad,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: actividadDetalleQueryKey(variables.actividadId) })
      onSuccess?.(data, variables, ...rest)
    },
    ...restConfig,
  })
}

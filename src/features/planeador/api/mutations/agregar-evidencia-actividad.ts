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
 * Postman `planeador-guia-completa`, 4.11): agrega una evidencia a una
 * actividad YA creada, con guardado inmediato. Único uso restante: el panel
 * de detalle de solo lectura (`DetailSections`), donde tocar el checkbox
 * guarda al instante en vez de esperar un submit — sí existe
 * `PATCH /planeador/actividades/evidencias/:id` para desvincular (pide el
 * pk de la RELACIÓN, `PK_TACTIVIDAD_EVIDENCIA`, ver el comentario de
 * `disabledIds` en `EnunciadosEvidenciasChecklist`), pero ese panel no
 * conoce ese pk hoy, así que sigue sin forma de destildar desde ahí. Al
 * crear/editar una actividad ya no hace falta este endpoint:
 * `values.evidenciasIds` viaja completo en el `POST`/`PUT` de la actividad
 * misma (reemplazo total en el PUT, sso V492 — ver `update-actividad.ts`).
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

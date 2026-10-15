import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { NOTIFICACIONES_ENDPOINTS } from "@/features/notificaciones/api/endpoints"
import { preferenciasQueryKey } from "@/features/notificaciones/api/query/use-preferencias-query"
import type { PreferenciasFormValues } from "@/features/notificaciones/api/schema"
import type { PreferenciasPayload } from "@/features/notificaciones/api/types"

/**
 * Body del `PUT`: solo push/email por tipo (in-app no se manda, D-3.1) y el
 * horario. Las celdas bloqueadas por la institución se envían igual; el
 * servidor es quien las rechaza (D-3.3), el front solo las deshabilita.
 */
export function toPreferenciasPayload(values: PreferenciasFormValues): PreferenciasPayload {
  return {
    tipos: values.tipos.map(({ tipo, push, email }) => ({ tipo, push, email })),
    horario_silencioso: {
      activo: values.horarioSilencioso.activo,
      desde: values.horarioSilencioso.desde,
      hasta: values.horarioSilencioso.hasta,
      dias: [...values.horarioSilencioso.dias].sort((a, b) => a - b),
    },
  }
}

export async function updatePreferencias(values: PreferenciasFormValues): Promise<void> {
  await api.put(NOTIFICACIONES_ENDPOINTS.preferencias(), toPreferenciasPayload(values))
}

export function useUpdatePreferencias({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof updatePreferencias> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: updatePreferencias,
    ...rest,
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: preferenciasQueryKey })
      onSuccess?.(...args)
    },
  })
}

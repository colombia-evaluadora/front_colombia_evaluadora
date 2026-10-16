import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { NOTIFICACIONES_ENDPOINTS } from "@/features/notificaciones/api/endpoints"
import type { CategoriaNotificacion } from "@/features/notificaciones/api/types"

/** `POST /notificaciones/leer-todas { categoria? }`; sin categoría marca todas. */
export async function marcarTodasLeidas({ categoria }: { categoria?: CategoriaNotificacion } = {}): Promise<void> {
  await api.post(NOTIFICACIONES_ENDPOINTS.leerTodas(), categoria ? { categoria } : {})
}

export function useMarcarTodasLeidas({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof marcarTodasLeidas> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: marcarTodasLeidas,
    ...rest,
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: ["notificaciones"] })
      onSuccess?.(...args)
    },
  })
}

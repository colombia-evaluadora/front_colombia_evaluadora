import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { NOTIFICACIONES_ENDPOINTS } from "@/features/notificaciones/api/endpoints"

/** `PATCH /notificaciones/{id}/archivar`: sale de la bandeja (no hay DELETE). */
export async function archivarNotificacion({ id }: { id: string }): Promise<void> {
  await api.patch(NOTIFICACIONES_ENDPOINTS.archivar(id), {})
}

export function useArchivarNotificacion({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof archivarNotificacion> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: archivarNotificacion,
    ...rest,
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: ["notificaciones"] })
      onSuccess?.(...args)
    },
  })
}

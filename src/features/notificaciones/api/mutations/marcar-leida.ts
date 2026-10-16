import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { closeSystemNotification } from "@/features/notificaciones/push/lib/push-client"
import type { MutationConfig } from "@/lib/react-query"
import { NOTIFICACIONES_ENDPOINTS } from "@/features/notificaciones/api/endpoints"
import { contadorQueryKey } from "@/features/notificaciones/api/query/use-contador-query"
import type { NotificacionesPage } from "@/features/notificaciones/api/types"

export interface MarcarLeidaVariables {
  id: string
  /** `false` = marcar como no leída. */
  leida: boolean
}

/** `PATCH /notificaciones/{id}/leida { leida }`. Idempotente por id. */
export async function marcarLeida({ id, leida }: MarcarLeidaVariables): Promise<void> {
  await api.patch(NOTIFICACIONES_ENDPOINTS.leida(id), { leida })
}

/**
 * Actualiza la cache al instante (el clic en una notificación navega enseguida
 * y el badge debe bajar ya) y luego invalida `["notificaciones"]` para
 * reconciliar con el servidor, tanto si sale bien como si falla.
 */
export function useMarcarLeida({ mutationConfig }: { mutationConfig?: MutationConfig<typeof marcarLeida> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, onError, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: marcarLeida,
    ...rest,
    onMutate: (variables) => {
      let cambio = 0
      queryClient.setQueriesData<InfiniteData<NotificacionesPage>>({ queryKey: ["notificaciones", "lista"] }, (data) => {
        if (!data?.pages) return data
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((n) => {
              if (n.id !== variables.id || n.leida === variables.leida) return n
              cambio = variables.leida ? -1 : 1
              return { ...n, leida: variables.leida }
            }),
          })),
        }
      })
      if (cambio !== 0) {
        queryClient.setQueryData<number>(contadorQueryKey, (n) => Math.max(0, (n ?? 0) + cambio))
      }
    },
    onSuccess: (...args) => {
      // Push (tarea 3.6): leída acá = cerrar la notificación del sistema en este dispositivo.
      if (args[1].leida) void closeSystemNotification(args[1].id)
      void queryClient.invalidateQueries({ queryKey: ["notificaciones"] })
      onSuccess?.(...args)
    },
    onError: (...args) => {
      void queryClient.invalidateQueries({ queryKey: ["notificaciones"] })
      onError?.(...args)
    },
  })
}

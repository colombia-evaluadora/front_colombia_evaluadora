import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  deletePushSuscripcion,
  fetchPushSuscripciones,
} from "@/features/notificaciones/push/api/push-api"
import {
  subscribeThisDevice,
  unsubscribeThisDevice,
} from "@/features/notificaciones/push/lib/push-client"
import type { MutationConfig } from "@/lib/react-query"

export const pushSuscripcionesQueryKey = ["notificaciones", "push", "suscripciones"] as const

export function usePushSuscripcionesQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: pushSuscripcionesQueryKey,
    queryFn: fetchPushSuscripciones,
    enabled,
  })
}

/** Alta de ESTE navegador. Llamar solo desde el `onClick` (D-4.5). */
export function useSubscribePush({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof subscribeThisDevice> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: subscribeThisDevice,
    ...rest,
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: pushSuscripcionesQueryKey })
      onSuccess?.(...args)
    },
  })
}

/** Baja de ESTE navegador (backend + push service). */
export function useUnsubscribePush({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof unsubscribeThisDevice> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: unsubscribeThisDevice,
    ...rest,
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: pushSuscripcionesQueryKey })
      onSuccess?.(...args)
    },
  })
}

/** Baja de OTRO dispositivo desde la lista. */
export function useDeletePushSuscripcion({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof deletePushSuscripcion> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: deletePushSuscripcion,
    ...rest,
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: pushSuscripcionesQueryKey })
      onSuccess?.(...args)
    },
  })
}

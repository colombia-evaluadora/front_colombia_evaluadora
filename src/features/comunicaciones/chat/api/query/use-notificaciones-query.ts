import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { NotificacionChat } from "@/features/comunicaciones/chat/api/types"

// Se consulta cada minuto para que la invitación a votar llegue sin recargar.
export function useNotificacionesQuery() {
  return useQuery({
    queryKey: chatKeys.notificaciones,
    queryFn: () => evalCol.getRows<NotificacionChat>("/comunicaciones/notificaciones"),
    refetchInterval: 60_000,
    // Solo existe en el mock; con el backend real la campana queda vacía.
    enabled: env.ENABLE_API_MOCKING,
  })
}

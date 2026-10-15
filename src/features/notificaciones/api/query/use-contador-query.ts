import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { offlineMeta, TTL_OFFLINE } from "@/lib/offline/query-meta"
import { NOTIFICACIONES_ENDPOINTS } from "@/features/notificaciones/api/endpoints"
import type { ContadorRow } from "@/features/notificaciones/api/types"

export const contadorQueryKey = ["notificaciones", "contador"] as const

async function fetchContador(): Promise<number> {
  const row = await api.get<ContadorRow>(NOTIFICACIONES_ENDPOINTS.contador())
  return Number(row?.no_leidas ?? 0)
}

/**
 * Contador de no leídas de la campana. Hasta que exista el gateway de tiempo
 * real (`add-tiempo-real-gateway`, evento `notification.created`) se refresca
 * por polling; cuando llegue, `useRealtimeEvent` hará `setQueryData` sobre
 * esta key y el intervalo se puede quitar.
 */
export function useContadorQuery() {
  return useQuery({
    queryKey: contadorQueryKey,
    queryFn: fetchContador,
    refetchInterval: 60_000,
    meta: offlineMeta(TTL_OFFLINE.detalle),
  })
}

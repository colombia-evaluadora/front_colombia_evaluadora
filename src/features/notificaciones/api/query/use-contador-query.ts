import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { realtimeEnabled } from "@/lib/realtime"
import { offlineMeta, TTL_OFFLINE } from "@/lib/offline/query-meta"
import { NOTIFICACIONES_ENDPOINTS } from "@/features/notificaciones/api/endpoints"
import type { ContadorRow } from "@/features/notificaciones/api/types"

export const contadorQueryKey = ["notificaciones", "contador"] as const

export async function fetchContador(): Promise<number> {
  const row = await api.get<ContadorRow>(NOTIFICACIONES_ENDPOINTS.contador())
  return Number(row?.no_leidas ?? 0)
}

/**
 * Contador de no leídas de la campana. Con tiempo real lo refrescan los
 * eventos `notification.*` (`useNotificacionesTiempoReal`); sin él, polling.
 * Con socket se deja un polling lento de respaldo (el gateway es best-effort).
 */
export function useContadorQuery() {
  return useQuery({
    queryKey: contadorQueryKey,
    queryFn: fetchContador,
    refetchInterval: realtimeEnabled ? 5 * 60_000 : 60_000,
    // Contador del header: si sin red no está guardado, la pantalla abierta
    // no está "incompleta" (el banner offline no lo cuenta).
    meta: { ...offlineMeta(TTL_OFFLINE.detalle), offlineOptional: true },
  })
}

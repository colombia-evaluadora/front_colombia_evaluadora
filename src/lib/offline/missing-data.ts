/**
 * Red de seguridad del banner offline: ¿la pantalla abierta usa alguna query
 * que no tiene datos porque no hubo red? (auditoría de cargas infinitas,
 * `docs/offline/AUDITORIA-RUTAS.md`). Cubre las vistas que no pintan su propio
 * aviso (un select vacío, un panel que simplemente no aparece): el banner
 * agrega "Parte de esta pantalla no está guardada en este equipo".
 */
import { useSyncExternalStore } from "react"
import { useQueryClient, type Query, type QueryClient } from "@tanstack/react-query"

import { isNetworkError } from "@/lib/network-error"
import { useConnectivity } from "@/lib/offline/use-connectivity"

/**
 * Query observada (con observador habilitado), sin datos y sin red: falló por
 * red o quedó pausada (las que fijan `networkMode: "online"`). Las que se
 * marcan `meta.offlineOptional` (contadores del header, el asistente) no
 * cuentan: que falten no deja la pantalla incompleta.
 */
export function isMissingOfflineData(query: Query): boolean {
  if (query.state.data !== undefined || !query.isActive()) return false
  if (query.meta?.offlineOptional) return false
  if (query.state.status === "error") return isNetworkError(query.state.error)
  return query.state.fetchStatus === "paused"
}

export function hasMissingOfflineData(client: QueryClient): boolean {
  return client.getQueryCache().getAll().some(isMissingOfflineData)
}

/** `true` sin conexión si la pantalla tiene datos que no están en el equipo. */
export function useOfflineMissingData(): boolean {
  const queryClient = useQueryClient()
  const offline = useConnectivity().status === "offline"
  return useSyncExternalStore(
    (onChange) => queryClient.getQueryCache().subscribe(onChange),
    () => offline && hasMissingOfflineData(queryClient),
    () => false,
  )
}

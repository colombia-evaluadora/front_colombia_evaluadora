import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  archivarConversacion,
  listarConversaciones,
  obtenerConversacion,
  obtenerSugerencias,
} from "@/features/assistant/api/agente-client"

export const conversacionesQueryKey = ["asistente", "conversaciones"] as const
export const conversacionQueryKey = (id: string) => ["asistente", "conversacion", id] as const

/** Conversaciones propias no archivadas, recientes primero (el backend topa en 50). */
export function useConversacionesQuery({ enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: conversacionesQueryKey,
    queryFn: () => listarConversaciones(0, 50),
    enabled,
    // El historial depende del servidor del agente: sin conexión no hay nada que mostrar.
    networkMode: "online",
  })
}

export function useConversacionQuery(id: string | null) {
  return useQuery({
    queryKey: conversacionQueryKey(id ?? ""),
    queryFn: () => obtenerConversacion(id!),
    enabled: Boolean(id),
    networkMode: "online",
  })
}

export function useArchivarConversacion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: archivarConversacion,
    onSuccess: (_data, id) => {
      // `["asistente"]` prefija la lista y el detalle.
      queryClient.invalidateQueries({ queryKey: conversacionesQueryKey })
      queryClient.removeQueries({ queryKey: conversacionQueryKey(id) })
    },
  })
}

export const sugerenciasQueryKey = (ruta: string) => ["asistente", "sugerencias", ruta] as const

/**
 * Sugerencias del backend para la pantalla (`GET /sugerencias?ruta=`), ya
 * filtradas por los menús y roles del usuario. Se piden por `pathname` (sin
 * query) para no repetir la consulta en cada cambio de filtro; si fallan, el
 * sheet cae a las sugerencias fijas de `lib/sugerencias.ts`.
 */
export function useSugerenciasQuery(ruta: string, { enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: sugerenciasQueryKey(ruta),
    queryFn: () => obtenerSugerencias(ruta),
    enabled,
    staleTime: 5 * 60_000,
    networkMode: "online",
  })
}

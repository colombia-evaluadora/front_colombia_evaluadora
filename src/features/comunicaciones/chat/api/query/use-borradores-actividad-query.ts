import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { BorradorActividad } from "@/features/comunicaciones/chat/api/types"
import { CHAT_FUNCIONES } from "@/features/comunicaciones/chat/lib/funciones-disponibles"

/** Borradores de comunicados, encuestas, elecciones y evaluaciones del usuario (sin `datos`). */
export function useBorradoresActividadQuery() {
  return useQuery({
    queryKey: chatKeys.borradoresActividad,
    queryFn: () => evalCol.getRows<BorradorActividad>("/comunicaciones/borradores-actividad"),
    enabled: CHAT_FUNCIONES.borradores,
    meta: { offlineOptional: true },
  })
}

/** Detalle con `datos` (el estado del diálogo) para retomarlo. */
export function fetchBorradorActividad(id: number) {
  return evalCol.getRow<BorradorActividad>(`/comunicaciones/borradores-actividad/${id}`)
}

export function useBorradorActividadQuery(id: number | undefined) {
  return useQuery({
    queryKey: chatKeys.borradorActividad(id ?? 0),
    queryFn: () => fetchBorradorActividad(id as number),
    enabled: !!id,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  })
}

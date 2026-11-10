import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { reservasCupoKeys } from "@/features/coverage/inscripcion-reservas/api/query/use-reservas-cupo-query"
import type {
  CatalogosAcciones,
  GrupoConCupo,
  OpcionCupo,
  ReservaCupoDetalle,
} from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"

export const reservaKeys = {
  detalle: (id: string) => [...reservasCupoKeys.all, "detalle", id] as const,
  opcionesCupo: (id: string) => [...reservasCupoKeys.all, "detalle", id, "opciones-cupo"] as const,
  grupos: (id: string) => [...reservasCupoKeys.all, "detalle", id, "grupos"] as const,
  catalogosAcciones: [...reservasCupoKeys.all, "catalogos-acciones"] as const,
}

export function useReservaDetalleQuery(id: string | null) {
  return useQuery({
    queryKey: reservaKeys.detalle(id ?? "none"),
    queryFn: () => api.get<ReservaCupoDetalle>(`/coverage/reservas-cupo/${id}`),
    enabled: Boolean(id),
  })
}

export function useOpcionesCupoQuery(id: string | null) {
  return useQuery({
    queryKey: reservaKeys.opcionesCupo(id ?? "none"),
    queryFn: () => api.get<OpcionCupo[]>(`/coverage/reservas-cupo/${id}/opciones-cupo`),
    enabled: Boolean(id),
  })
}

export function useGruposConCupoQuery(id: string | null) {
  return useQuery({
    queryKey: reservaKeys.grupos(id ?? "none"),
    queryFn: () => api.get<GrupoConCupo[]>(`/coverage/reservas-cupo/${id}/grupos`),
    enabled: Boolean(id),
  })
}

export function useCatalogosAccionesQuery() {
  return useQuery({
    queryKey: reservaKeys.catalogosAcciones,
    queryFn: () => api.get<CatalogosAcciones>("/coverage/reservas-cupo/catalogos-acciones"),
    staleTime: Infinity,
  })
}

/** Grupos con cupo para TODAS las reservas marcadas (incluido el cupo contratado). */
export function useGruposConCupoLoteQuery(ids: string[], enabled: boolean) {
  return useQuery({
    queryKey: [...reservasCupoKeys.all, "grupos-lote", ids] as const,
    queryFn: () => api.query<GrupoConCupo[]>("/coverage/reservas-cupo/grupos-lote", { ids }),
    enabled: enabled && ids.length > 0,
  })
}

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  PeriodoInscripciones,
  ReservasCupoCatalogos,
  ReservasCupoQueryRequest,
  ReservasCupoQueryResponse,
} from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"

export const reservasCupoKeys = {
  all: ["reservas-cupo"] as const,
  list: (params: ReservasCupoQueryRequest) => ["reservas-cupo", "list", params] as const,
  periodos: ["reservas-cupo", "periodos-inscripciones"] as const,
  catalogos: ["reservas-cupo", "catalogos"] as const,
}

export function useReservasCupoQuery(params: ReservasCupoQueryRequest) {
  return useQuery({
    queryKey: reservasCupoKeys.list(params),
    queryFn: () => api.query<ReservasCupoQueryResponse>("/coverage/reservas-cupo/query", params),
    placeholderData: (previous) => previous,
  })
}

export function usePeriodosInscripcionesQuery() {
  return useQuery({
    queryKey: reservasCupoKeys.periodos,
    queryFn: () =>
      api.get<PeriodoInscripciones[]>("/coverage/reservas-cupo/periodos-inscripciones"),
  })
}

export function useReservasCupoCatalogosQuery() {
  return useQuery({
    queryKey: reservasCupoKeys.catalogos,
    queryFn: () => api.get<ReservasCupoCatalogos>("/coverage/reservas-cupo/catalogos"),
    staleTime: 5 * 60_000,
  })
}

export const formatPeriodo = (p: Pick<PeriodoInscripciones, "anio" | "modalidad" | "ciclo">) =>
  `${p.anio} · ${p.modalidad} · Ciclo ${p.ciclo}`

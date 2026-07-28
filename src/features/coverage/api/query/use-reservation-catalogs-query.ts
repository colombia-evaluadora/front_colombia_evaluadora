import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { ReservationCatalogs } from "../types/reservation"

function fetchReservationCatalogs(): Promise<ReservationCatalogs> {
  return api.get("/coverage/reservations/catalogs")
}

// Los catálogos (instituciones, sedes, grupos, grados) alimentan los selects
// del sheet de filtros y del formulario de alta. Cambian poco, así que
// quedan cacheados largo.
export function useReservationCatalogsQuery() {
  return useQuery({
    queryKey: ["reservations", "catalogs"],
    queryFn: fetchReservationCatalogs,
    staleTime: 5 * 60 * 1000,
  })
}

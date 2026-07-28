import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { ReservationsStats, ReservationsStatsRequest } from "../types/reservation"

function fetchReservationsStats(body: ReservationsStatsRequest): Promise<ReservationsStats> {
  return api.query("/coverage/reservations/stats", body)
}

export function useReservationsStatsQuery(params: ReservationsStatsRequest) {
  return useQuery({
    queryKey: ["reservations", "stats", params],
    queryFn: () => fetchReservationsStats(params),
    placeholderData: (previous) => previous,
  })
}

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { ReservationsQueryRequest, ReservationsQueryResponse } from "@/features/coverage/api/types/reservation"

interface UseReservationsQueryParams {
  filters: ReservationsQueryRequest["filters"]
  sorting: ReservationsQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

function fetchReservations(body: ReservationsQueryRequest): Promise<ReservationsQueryResponse> {
  return api.query("/coverage/reservations/query", body)
}

export const reservationsQueryKey = (params: UseReservationsQueryParams) => ["reservations", params]

export function useReservationsQuery(params: UseReservationsQueryParams) {
  return useQuery({
    queryKey: reservationsQueryKey(params),
    queryFn: () => fetchReservations(params),
    placeholderData: (previous) => previous,
  })
}

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { PaymentsQueryRequest, PaymentsQueryResponse } from "../types/payment"

interface UsePaymentsQueryParams {
  filters: PaymentsQueryRequest["filters"]
  sorting: PaymentsQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

function fetchPayments(body: PaymentsQueryRequest): Promise<PaymentsQueryResponse> {
  return api.query("/payments/query", body)
}

export const paymentsQueryKey = (params: UsePaymentsQueryParams) => [
  "payments",
  params,
]

export function usePaymentsQuery(params: UsePaymentsQueryParams) {
  return useQuery({
    queryKey: paymentsQueryKey(params),
    queryFn: () => fetchPayments(params),
    placeholderData: (previous) => previous,
  })
}

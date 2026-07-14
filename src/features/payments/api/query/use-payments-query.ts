import { useQuery } from "@tanstack/react-query"

import type { PaymentsQueryRequest, PaymentsQueryResponse } from "../types/payment"

interface UsePaymentsQueryParams {
  filters: PaymentsQueryRequest["filters"]
  sorting: PaymentsQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

async function fetchPayments(
  body: PaymentsQueryRequest
): Promise<PaymentsQueryResponse> {
  const response = await fetch("/payments/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error("No se pudieron cargar los pagos.")
  return response.json()
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

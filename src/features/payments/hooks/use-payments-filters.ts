import { useCallback, useMemo } from "react"

import { paymentsRoute } from "@/router"

import type {
  PaymentFiltersFormInput,
  PaymentFiltersFormValues,
} from "../api/schema"
import type { PaymentsQueryRequest } from "../api/types/payment"

export interface PaymentsFilters {
  filters: PaymentFiltersFormInput
  queryFilters: PaymentsQueryRequest["filters"]
  applyFilters: (values: PaymentFiltersFormValues) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

export function usePaymentsFilters(): PaymentsFilters {
  const search = paymentsRoute.useSearch()
  const navigate = paymentsRoute.useNavigate()

  const applyFilters = useCallback(
    (values: PaymentFiltersFormValues) => {
      navigate({
        search: (prev) => ({
          ...prev,
          email: values.email || undefined,
          statuses: values.statuses.length ? values.statuses : undefined,
          amountMin: values.amountMin,
          amountMax: values.amountMax,
          page: 0,
        }),
        replace: true,
      })
    },
    [navigate]
  )

  const clearAllFilters = useCallback(() => {
    navigate({
      search: (prev) => ({
        ...prev,
        email: undefined,
        statuses: undefined,
        amountMin: undefined,
        amountMax: undefined,
        page: 0,
      }),
      replace: true,
    })
  }, [navigate])

  const queryFilters: PaymentsQueryRequest["filters"] = useMemo(
    () => ({
      email: search.email,
      status: search.statuses,
      amountMin: search.amountMin,
      amountMax: search.amountMax,
    }),
    [search.email, search.statuses, search.amountMin, search.amountMax]
  )

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (search.email) n += 1
    n += search.statuses?.length ?? 0
    if (search.amountMin != null || search.amountMax != null) n += 1
    return n
  }, [search.email, search.statuses, search.amountMin, search.amountMax])

  return {
    filters: {
      email: search.email ?? "",
      statuses: search.statuses ?? [],
      amountMin: search.amountMin?.toString() ?? "",
      amountMax: search.amountMax?.toString() ?? "",
    },
    queryFilters,
    applyFilters,
    clearAllFilters,
    activeFilterCount,
  }
}

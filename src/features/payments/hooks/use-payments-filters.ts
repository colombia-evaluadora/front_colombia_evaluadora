import { useCallback, useMemo } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"

import type {
  PaymentFiltersFormInput,
  PaymentFiltersFormValues,
  PaymentsSearch,
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
  // Selects only the filter fields so this hook doesn't re-render when
  // page/pageSize change on the same route (that's usePagination's job).
  //
  // `from` differs between the two calls below on purpose: `useSearch`
  // keys off the route id ("/app/", trailing slash — payments is the
  // index route under /app), while `useNavigate`/`to` key off the
  // fullPath ("/app", no trailing slash). Mixing these up has broken this
  // exact hook before (see commit 171d123) — don't "fix" it into one string.
  const search = useSearch({
    from: "/app/",
    select: (search) => ({
      email: search.email,
      status: search.status,
      amountMin: search.amountMin,
      amountMax: search.amountMax,
    }),
  })
  const navigate = useNavigate({ from: "/app" })

  const email = search.email ?? ""
  const statuses = useMemo(() => search.status ?? [], [search.status])
  const amountMin = search.amountMin ?? null
  const amountMax = search.amountMax ?? null

  const applyFilters = useCallback(
    (values: PaymentFiltersFormValues) => {
      navigate({
        to: "/app",
        search: (prev: PaymentsSearch) => ({
          email: values.email || undefined,
          status: values.statuses.length ? values.statuses : undefined,
          amountMin: values.amountMin ?? undefined,
          amountMax: values.amountMax ?? undefined,
          pageSize: prev.pageSize,
        }),
        replace: true,
      })
    },
    [navigate]
  )

  const clearAllFilters = useCallback(() => {
    navigate({
      to: "/app",
      search: (prev: PaymentsSearch) => ({ pageSize: prev.pageSize }),
      replace: true,
    })
  }, [navigate])

  const queryFilters: PaymentsQueryRequest["filters"] = useMemo(
    () => ({
      email: email || undefined,
      status: statuses.length ? statuses : undefined,
      amountMin: amountMin ?? undefined,
      amountMax: amountMax ?? undefined,
    }),
    [email, statuses, amountMin, amountMax]
  )

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (email) n += 1
    n += statuses.length
    if (amountMin != null || amountMax != null) n += 1
    return n
  }, [email, statuses, amountMin, amountMax])

  return {
    filters: {
      email,
      statuses,
      amountMin: amountMin?.toString() ?? "",
      amountMax: amountMax?.toString() ?? "",
    },
    queryFilters,
    applyFilters,
    clearAllFilters,
    activeFilterCount,
  }
}

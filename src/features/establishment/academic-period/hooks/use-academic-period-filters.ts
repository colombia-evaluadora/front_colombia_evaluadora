import { useCallback, useMemo } from "react"

import { periodosAcademicosRoute } from "@/router"

import type {
  AcademicPeriodsFiltersFormInput,
  AcademicPeriodsFiltersFormValues,
} from "../api/schema"
import type {
  AcademicPeriodsQueryFilters,
  AcademicPeriodStatus,
} from "../api/types/academic-period"

export interface AcademicPeriodFilters {
  filters: AcademicPeriodsFiltersFormInput
  queryFilters: AcademicPeriodsQueryFilters
  applyFilters: (values: AcademicPeriodsFiltersFormValues) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

export function useAcademicPeriodFilters(): AcademicPeriodFilters {
  const search = periodosAcademicosRoute.useSearch()
  const navigate = periodosAcademicosRoute.useNavigate()

  const applyFilters = useCallback(
    (values: AcademicPeriodsFiltersFormValues) => {
      navigate({
        search: (prev) => ({
          ...prev,
          sedeName: values.sedeName || undefined,
          schoolYearId: values.schoolYearId
            ? Number(values.schoolYearId)
            : undefined,
          status: (values.status as AcademicPeriodStatus) || undefined,
          startFrom: values.startFrom || undefined,
          startTo: values.startTo || undefined,
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
        sedeName: undefined,
        schoolYearId: undefined,
        status: undefined,
        startFrom: undefined,
        startTo: undefined,
        page: 0,
      }),
      replace: true,
    })
  }, [navigate])

  const queryFilters: AcademicPeriodsQueryFilters = useMemo(
    () => ({
      sedeName: search.sedeName,
      schoolYearId: search.schoolYearId,
      status: search.status ? [search.status] : undefined,
      startFrom: search.startFrom,
      startTo: search.startTo,
    }),
    [
      search.sedeName,
      search.schoolYearId,
      search.status,
      search.startFrom,
      search.startTo,
    ]
  )

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (search.sedeName) n += 1
    if (search.schoolYearId) n += 1
    if (search.status) n += 1
    if (search.startFrom || search.startTo) n += 1
    return n
  }, [
    search.sedeName,
    search.schoolYearId,
    search.status,
    search.startFrom,
    search.startTo,
  ])

  return {
    filters: {
      sedeName: search.sedeName ?? "",
      schoolYearId: search.schoolYearId ? String(search.schoolYearId) : "",
      status: search.status ?? "",
      startFrom: search.startFrom ?? "",
      startTo: search.startTo ?? "",
    },
    queryFilters,
    applyFilters,
    clearAllFilters,
    activeFilterCount,
  }
}

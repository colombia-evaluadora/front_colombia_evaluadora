import { useCallback, useMemo } from "react"

import { periodosAcademicosRoute } from "@/router"

import type { AcademicPeriodsQueryFilters } from "../../api/types/academic-period/academic-period"
import type { AcademicPeriodStatus } from "../../api/types/academic-period/academic-period"

export interface AcademicPeriodFilters {
  sedeName: string
  schoolYearId: number | undefined
  status: AcademicPeriodStatus | undefined
  queryFilters: AcademicPeriodsQueryFilters
  setSedeName: (value: string) => void
  setSchoolYearId: (value: number | undefined) => void
  setStatus: (value: AcademicPeriodStatus | undefined) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

export function useAcademicPeriodFilters(): AcademicPeriodFilters {
  const search = periodosAcademicosRoute.useSearch()
  const navigate = periodosAcademicosRoute.useNavigate()

  const setSedeName = useCallback(
    (value: string) => {
      navigate({
        search: (prev) => ({ ...prev, sedeName: value || undefined, page: 0 }),
        replace: true,
      })
    },
    [navigate]
  )

  const setSchoolYearId = useCallback(
    (value: number | undefined) => {
      navigate({
        search: (prev) => ({ ...prev, schoolYearId: value, page: 0 }),
        replace: true,
      })
    },
    [navigate]
  )

  const setStatus = useCallback(
    (value: AcademicPeriodStatus | undefined) => {
      navigate({
        search: (prev) => ({ ...prev, status: value, page: 0 }),
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
    }),
    [search.sedeName, search.schoolYearId, search.status]
  )

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (search.sedeName) n += 1
    if (search.schoolYearId) n += 1
    if (search.status) n += 1
    return n
  }, [search.sedeName, search.schoolYearId, search.status])

  return {
    sedeName: search.sedeName ?? "",
    schoolYearId: search.schoolYearId,
    status: search.status,
    queryFilters,
    setSedeName,
    setSchoolYearId,
    setStatus,
    clearAllFilters,
    activeFilterCount,
  }
}

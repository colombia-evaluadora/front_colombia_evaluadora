import { useCallback, useMemo } from "react"

import { coberturaInscritosRoute } from "@/router"

import { RESERVATION_GROUP_BY } from "@/features/coverage/api/schema"
import type { EnrollmentFiltersFormInput, EnrollmentFiltersFormValues } from "@/features/coverage/api/schema"
import type { EnrollmentsQueryFilters } from "@/features/coverage/api/types/enrollment"
import type { ReservationGroupBy } from "@/features/coverage/api/types/reservation"

export interface EnrollmentFilters {
  filters: EnrollmentFiltersFormInput
  queryFilters: EnrollmentsQueryFilters
  applyFilters: (values: EnrollmentFiltersFormValues) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

function toGroupBy(value: string): ReservationGroupBy | undefined {
  return RESERVATION_GROUP_BY.includes(value as ReservationGroupBy)
    ? (value as ReservationGroupBy)
    : undefined
}

export function useEnrollmentFilters(): EnrollmentFilters {
  const search = coberturaInscritosRoute.useSearch()
  const navigate = coberturaInscritosRoute.useNavigate()

  const applyFilters = useCallback(
    (values: EnrollmentFiltersFormValues) => {
      navigate({
        search: (prev) => ({
          ...prev,
          firstName: values.firstName || undefined,
          lastName: values.lastName || undefined,
          documentNumber: values.documentNumber || undefined,
          institution: values.institution || undefined,
          campus: values.campus || undefined,
          grade: values.grade === "" ? undefined : Number(values.grade),
          group: values.group || undefined,
          shifts: values.shifts.length ? values.shifts : undefined,
          levels: values.levels.length ? values.levels : undefined,
          statuses: values.statuses.length ? values.statuses : undefined,
          reservedFrom: values.reservedFrom || undefined,
          reservedTo: values.reservedTo || undefined,
          groupBy: toGroupBy(values.groupBy),
          page: 0,
        }),
        replace: true,
      })
    },
    [navigate],
  )

  const clearAllFilters = useCallback(() => {
    navigate({
      search: (prev) => ({
        ...prev,
        firstName: undefined,
        lastName: undefined,
        documentNumber: undefined,
        institution: undefined,
        campus: undefined,
        grade: undefined,
        group: undefined,
        shifts: undefined,
        levels: undefined,
        statuses: undefined,
        reservedFrom: undefined,
        reservedTo: undefined,
        groupBy: undefined,
        page: 0,
      }),
      replace: true,
    })
  }, [navigate])

  const queryFilters: EnrollmentsQueryFilters = useMemo(
    () => ({
      firstName: search.firstName,
      lastName: search.lastName,
      documentNumber: search.documentNumber,
      institution: search.institution,
      campus: search.campus,
      grade: search.grade,
      group: search.group,
      shifts: search.shifts,
      levels: search.levels,
      statuses: search.statuses,
      reservedFrom: search.reservedFrom,
      reservedTo: search.reservedTo,
      groupBy: search.groupBy,
    }),
    [
      search.firstName,
      search.lastName,
      search.documentNumber,
      search.institution,
      search.campus,
      search.grade,
      search.group,
      search.shifts,
      search.levels,
      search.statuses,
      search.reservedFrom,
      search.reservedTo,
      search.groupBy,
    ],
  )

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (search.firstName) n += 1
    if (search.lastName) n += 1
    if (search.documentNumber) n += 1
    if (search.institution) n += 1
    if (search.campus) n += 1
    if (search.grade != null) n += 1
    if (search.group) n += 1
    n += search.shifts?.length ?? 0
    n += search.levels?.length ?? 0
    n += search.statuses?.length ?? 0
    if (search.reservedFrom || search.reservedTo) n += 1
    if (search.groupBy) n += 1
    return n
  }, [
    search.firstName,
    search.lastName,
    search.documentNumber,
    search.institution,
    search.campus,
    search.grade,
    search.group,
    search.shifts,
    search.levels,
    search.statuses,
    search.reservedFrom,
    search.reservedTo,
    search.groupBy,
  ])

  return {
    filters: {
      firstName: search.firstName ?? "",
      lastName: search.lastName ?? "",
      documentNumber: search.documentNumber ?? "",
      institution: search.institution ?? "",
      campus: search.campus ?? "",
      grade: search.grade != null ? String(search.grade) : "",
      group: search.group ?? "",
      shifts: search.shifts ?? [],
      levels: search.levels ?? [],
      statuses: search.statuses ?? [],
      reservedFrom: search.reservedFrom ?? "",
      reservedTo: search.reservedTo ?? "",
      groupBy: search.groupBy ?? "",
    },
    queryFilters,
    applyFilters,
    clearAllFilters,
    activeFilterCount,
  }
}

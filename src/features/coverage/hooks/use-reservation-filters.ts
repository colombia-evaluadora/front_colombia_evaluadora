import { useCallback, useMemo } from "react"

import { coberturaReservaCupoRoute } from "@/router"

import { RESERVATION_GROUP_BY } from "../api/schema"
import type { ReservationFiltersFormInput, ReservationFiltersFormValues } from "../api/schema"
import type { ReservationGroupBy, ReservationsQueryFilters } from "../api/types/reservation"

export interface ReservationFilters {
  filters: ReservationFiltersFormInput
  queryFilters: ReservationsQueryFilters
  applyFilters: (values: ReservationFiltersFormValues) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

function toGroupBy(value: string): ReservationGroupBy | undefined {
  return RESERVATION_GROUP_BY.includes(value as ReservationGroupBy)
    ? (value as ReservationGroupBy)
    : undefined
}

export function useReservationFilters(): ReservationFilters {
  const search = coberturaReservaCupoRoute.useSearch()
  const navigate = coberturaReservaCupoRoute.useNavigate()

  const applyFilters = useCallback(
    (values: ReservationFiltersFormValues) => {
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

  const queryFilters: ReservationsQueryFilters = useMemo(
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

  // Cada campo de texto cuenta 1; los multi-select cuentan por opción; el
  // rango de fechas cuenta 1 aunque tenga los dos extremos.
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

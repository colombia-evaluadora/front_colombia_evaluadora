import { employeesRoute } from "@/router"

import type { EmployeeFiltersFormInput } from "@/features/establishment/employees/api/schema"
import type { EmployeesQueryRequest } from "@/features/establishment/employees/api/types/employee"
import { useFiltrosDeListado } from "@/features/assistant/lib/registro-ui"

export interface EmployeesFilters {
  filters: EmployeeFiltersFormInput
  queryFilters: EmployeesQueryRequest["filters"]
  applyFilters: (values: EmployeeFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

export function useEmployeesFilters(): EmployeesFilters {
  const search = employeesRoute.useSearch()
  const navigate = employeesRoute.useNavigate()

  const applyFilters = (values: EmployeeFiltersFormInput) => {
      navigate({
        search: (prev) => ({
          ...prev,
          search: values.search || undefined,
          roles: values.roles.length ? values.roles : undefined,
          workSchedules: values.workSchedules.length ? values.workSchedules : undefined,
          statuses: values.statuses.length ? values.statuses : undefined,
          page: 0,
        }),
        replace: true,
      })
    }

  const clearAllFilters = () => {
    navigate({
      search: (prev) => ({
        ...prev,
        search: undefined,
        roles: undefined,
        workSchedules: undefined,
        statuses: undefined,
        page: 0,
      }),
      replace: true,
    })
  }

  const queryFilters = {
      search: search.search,
      roles: search.roles,
      workSchedules: search.workSchedules,
      statuses: search.statuses,
    }

  const activeFilterCount = (() => {
    let count = 0
    if (search.search) count += 1
    count += search.roles?.length ?? 0
    count += search.workSchedules?.length ?? 0
    count += search.statuses?.length ?? 0
    return count
  })()

  const filtrosForm = {
    search: search.search ?? "",
    roles: search.roles ?? [],
    workSchedules: search.workSchedules ?? [],
    statuses: search.statuses ?? [],
  }
  // UI asistida: `APLICAR_FILTROS` usa el mismo `applyFilters` que la persona.
  useFiltrosDeListado(filtrosForm, applyFilters)

  return {
    filters: filtrosForm,
    queryFilters,
    applyFilters,
    clearAllFilters,
    activeFilterCount,
  }
}
import { periodosAcademicosRoute } from "@/router"

import type {
  AcademicPeriodsFiltersFormInput,
  AcademicPeriodsFiltersFormValues,
} from "../api/schema"
import type { AcademicPeriodsQueryFilters } from "../api/types/academic-period"
import { useFiltrosDeListado } from "@/features/assistant/lib/registro-ui"

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

  const applyFilters = (values: AcademicPeriodsFiltersFormValues) => {
      navigate({
        search: (prev) => ({
          ...prev,
          sedeName: values.sedeName || undefined,
          schoolYearId: values.schoolYearId
            ? Number(values.schoolYearId)
            : undefined,
          statusId: values.statusId ? Number(values.statusId) : undefined,
          startFrom: values.startFrom || undefined,
          startTo: values.startTo || undefined,
          page: 0,
        }),
        replace: true,
      })
    }

  const clearAllFilters = () => {
    navigate({
      search: (prev) => ({
        ...prev,
        sedeName: undefined,
        schoolYearId: undefined,
        statusId: undefined,
        startFrom: undefined,
        startTo: undefined,
        page: 0,
      }),
      replace: true,
    })
  }

  const queryFilters: AcademicPeriodsQueryFilters = {
      sedeName: search.sedeName,
      schoolYearId: search.schoolYearId,
      statusId: search.statusId ? [search.statusId] : undefined,
      startFrom: search.startFrom,
      startTo: search.startTo,
    }

  const activeFilterCount = (() => {
    let n = 0
    if (search.sedeName) n += 1
    if (search.schoolYearId) n += 1
    if (search.statusId) n += 1
    if (search.startFrom || search.startTo) n += 1
    return n
  })()

  const filtrosForm = {
    sedeName: search.sedeName ?? "",
    schoolYearId: search.schoolYearId ? String(search.schoolYearId) : "",
    statusId: search.statusId != null ? String(search.statusId) : "",
    startFrom: search.startFrom ?? "",
    startTo: search.startTo ?? "",
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

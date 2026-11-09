import { periodosAcademicosRoute } from "@/router"

import type {
  AcademicPeriodsFiltersFormInput,
  AcademicPeriodsFiltersFormValues,
} from "../api/schema"
import { ENROLLMENT_MODALITIES } from "../api/schema"
import type { AcademicPeriodsQueryFilters, EnrollmentModality } from "../api/types/academic-period"
import { useFiltrosDeListado } from "@/features/assistant/lib/registro-ui"

export interface AcademicPeriodFilters {
  filters: AcademicPeriodsFiltersFormInput
  queryFilters: AcademicPeriodsQueryFilters
  applyFilters: (values: AcademicPeriodsFiltersFormValues) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

function toModality(value: string): EnrollmentModality | undefined {
  return ENROLLMENT_MODALITIES.find((m) => m.value === value)?.value
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
          sedeId: values.sedeId ? Number(values.sedeId) : undefined,
          jornadaId: values.jornadaId ? Number(values.jornadaId) : undefined,
          enrollmentModality: toModality(values.enrollmentModality),
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
        sedeId: undefined,
        jornadaId: undefined,
        enrollmentModality: undefined,
        page: 0,
      }),
      replace: true,
    })
  }

  const queryFilters: AcademicPeriodsQueryFilters = {
      sedeName: search.sedeName,
      schoolYearId: search.schoolYearId,
      statusId: search.statusId ? [search.statusId] : undefined,
      sedeId: search.sedeId,
      jornadaId: search.jornadaId,
      enrollmentModality: search.enrollmentModality,
    }

  const activeFilterCount = (() => {
    let n = 0
    if (search.sedeName) n += 1
    if (search.schoolYearId) n += 1
    if (search.statusId) n += 1
    if (search.sedeId) n += 1
    if (search.jornadaId) n += 1
    if (search.enrollmentModality) n += 1
    return n
  })()

  const filtrosForm = {
    sedeName: search.sedeName ?? "",
    schoolYearId: search.schoolYearId ? String(search.schoolYearId) : "",
    statusId: search.statusId != null ? String(search.statusId) : "",
    sedeId: search.sedeId != null ? String(search.sedeId) : "",
    jornadaId: search.jornadaId != null ? String(search.jornadaId) : "",
    enrollmentModality: search.enrollmentModality ?? "",
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

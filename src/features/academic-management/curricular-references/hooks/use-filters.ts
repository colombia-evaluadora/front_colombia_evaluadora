import { useCallback, useMemo } from "react"

import { gestionAcademicaReferentesCurricularesRoute } from "@/router"

import type { CurricularReferenceFiltersFormInput } from "@/features/academic-management/curricular-references/api/schema"
import type { CurricularReferencesQueryRequest } from "@/features/academic-management/curricular-references/api/types/curricular-reference"

export interface CurricularReferencesFilters {
  filters: CurricularReferenceFiltersFormInput
  queryFilters: CurricularReferencesQueryRequest["filters"]
  applyFilters: (values: CurricularReferenceFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

export function useCurricularReferencesFilters(): CurricularReferencesFilters {
  const search = gestionAcademicaReferentesCurricularesRoute.useSearch()
  const navigate = gestionAcademicaReferentesCurricularesRoute.useNavigate()

  const applyFilters = useCallback(
    (values: CurricularReferenceFiltersFormInput) => {
      navigate({
        search: (prev) => ({
          ...prev,
          search: values.search || undefined,
          educationLevels: values.educationLevels.length ? values.educationLevels : undefined,
          pedagogicalApproaches: values.pedagogicalApproaches.length
            ? values.pedagogicalApproaches
            : undefined,
          evaluationTypes: values.evaluationTypes.length ? values.evaluationTypes : undefined,
          active: values.active || undefined,
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
        search: undefined,
        educationLevels: undefined,
        pedagogicalApproaches: undefined,
        evaluationTypes: undefined,
        active: undefined,
        page: 0,
      }),
      replace: true,
    })
  }, [navigate])

  const queryFilters = useMemo(
    () => ({
      search: search.search,
      educationLevels: search.educationLevels,
      pedagogicalApproaches: search.pedagogicalApproaches,
      evaluationTypes: search.evaluationTypes,
      active: search.active,
    }),
    [
      search.search,
      search.educationLevels,
      search.pedagogicalApproaches,
      search.evaluationTypes,
      search.active,
    ],
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (search.search) count += 1
    count += search.educationLevels?.length ?? 0
    count += search.pedagogicalApproaches?.length ?? 0
    count += search.evaluationTypes?.length ?? 0
    if (search.active) count += 1
    return count
  }, [
    search.search,
    search.educationLevels,
    search.pedagogicalApproaches,
    search.evaluationTypes,
    search.active,
  ])

  return {
    filters: {
      search: search.search ?? "",
      educationLevels: search.educationLevels ?? [],
      pedagogicalApproaches: search.pedagogicalApproaches ?? [],
      evaluationTypes: search.evaluationTypes ?? [],
      active: search.active ?? "",
    },
    queryFilters,
    applyFilters,
    clearAllFilters,
    activeFilterCount,
  }
}

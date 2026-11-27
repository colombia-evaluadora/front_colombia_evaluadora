import { coberturaMatriculaRoute } from "@/router"

import type { MatriculaFiltersFormInput } from "@/features/coverage/shared/api/schema"
import type { MatriculaQueryRequest } from "@/features/coverage/matricula/api/types/matricula"
import { useFiltrosDeListado } from "@/features/assistant/lib/registro-ui"

export interface MatriculaFilters {
  filters: MatriculaFiltersFormInput
  queryFilters: MatriculaQueryRequest["filters"]
  applyFilters: (values: MatriculaFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

export function useMatriculaFilters(): MatriculaFilters {
  const search = coberturaMatriculaRoute.useSearch()
  const navigate = coberturaMatriculaRoute.useNavigate()

  const applyFilters = (values: MatriculaFiltersFormInput) => {
      navigate({
        search: (prev) => ({
          ...prev,
          search: values.search || undefined,
          statuses: values.statuses.length ? values.statuses : undefined,
          establecimiento: values.establecimiento ? Number(values.establecimiento) : undefined,
          campus: values.campus || undefined,
          shift: values.shift || undefined,
          grade: values.grade ? Number(values.grade) : undefined,
          group: values.group || undefined,
          periodo: values.periodo ? Number(values.periodo) : undefined,
          tipo: values.tipo === "PRINCIPAL" || values.tipo === "COMPLEMENTARIA" ? values.tipo : undefined,
          metodologia: values.metodologia ? Number(values.metodologia) : undefined,
          solicitud: values.solicitud === "CON_SOLICITUD" ? "CON_SOLICITUD" : undefined,
          nuevo: values.nuevo === "S" || values.nuevo === "N" ? values.nuevo : undefined,
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
        statuses: undefined,
        establecimiento: undefined,
        campus: undefined,
        shift: undefined,
        grade: undefined,
        group: undefined,
        periodo: undefined,
        tipo: undefined,
        metodologia: undefined,
        solicitud: undefined,
        nuevo: undefined,
        page: 0,
      }),
      replace: true,
    })
  }

  const queryFilters = {
      search: search.search,
      statuses: search.statuses,
      establecimiento: search.establecimiento,
      campus: search.campus,
      shift: search.shift,
      grade: search.grade,
      group: search.group,
      periodo: search.periodo,
      tipo: search.tipo,
      metodologia: search.metodologia,
      solicitud: search.solicitud,
      nuevo: search.nuevo,
    }

  const activeFilterCount = (() => {
    let count = 0
    if (search.search) count += 1
    count += search.statuses?.length ?? 0
    if (search.establecimiento != null) count += 1
    if (search.campus) count += 1
    if (search.shift) count += 1
    if (search.grade != null) count += 1
    if (search.group) count += 1
    if (search.periodo != null) count += 1
    if (search.tipo) count += 1
    if (search.metodologia != null) count += 1
    if (search.solicitud) count += 1
    if (search.nuevo) count += 1
    return count
  })()

  const filtrosForm = {
    search: search.search ?? "",
    statuses: search.statuses ?? [],
    establecimiento: search.establecimiento != null ? String(search.establecimiento) : "",
    campus: search.campus ?? "",
    shift: search.shift ?? "",
    grade: search.grade != null ? String(search.grade) : "",
    group: search.group ?? "",
    periodo: search.periodo != null ? String(search.periodo) : "",
    tipo: search.tipo ?? "",
    metodologia: search.metodologia != null ? String(search.metodologia) : "",
    solicitud: search.solicitud ?? "",
    nuevo: search.nuevo ?? "",
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

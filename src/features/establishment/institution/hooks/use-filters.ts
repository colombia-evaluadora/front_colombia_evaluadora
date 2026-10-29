import { establishmentsRoute } from "@/router"

import type { EstablishmentFiltersFormInput } from "@/features/establishment/institution/api/schema"
import type { EstablishmentsQueryRequest } from "@/features/establishment/institution/api/types/establishment"
import { useFiltrosDeListado } from "@/features/assistant/lib/registro-ui"

export interface EstablishmentsFilters {
  filters: EstablishmentFiltersFormInput
  queryFilters: EstablishmentsQueryRequest["filters"]
  applyFilters: (values: EstablishmentFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

/** Búsqueda libre y filtros Municipio y Sector, sincronizados con la URL. */
export function useEstablishmentsFilters(): EstablishmentsFilters {
  const search = establishmentsRoute.useSearch()
  const navigate = establishmentsRoute.useNavigate()

  const applyFilters = (values: EstablishmentFiltersFormInput) => {
    navigate({
      search: (prev) => ({
        ...prev,
        search: values.search || undefined,
        municipalities: values.municipalities.length ? values.municipalities : undefined,
        sectors: values.sectors.length ? values.sectors : undefined,
        page: 0,
      }),
      replace: true,
    })
  }

  const clearAllFilters = () => {
    navigate({
      search: (prev) => ({ ...prev, search: undefined, municipalities: undefined, sectors: undefined, page: 0 }),
      replace: true,
    })
  }

  const filters: EstablishmentFiltersFormInput = {
    search: search.search ?? "",
    municipalities: search.municipalities ?? [],
    sectors: search.sectors ?? [],
  }
  // UI asistida: `APLICAR_FILTROS` usa el mismo `applyFilters` que la persona.
  useFiltrosDeListado(filters, applyFilters)

  return {
    filters,
    queryFilters: { search: search.search, municipality: search.municipalities, sector: search.sectors },
    applyFilters,
    clearAllFilters,
    activeFilterCount: (search.search ? 1 : 0) + (search.municipalities?.length ?? 0) + (search.sectors?.length ?? 0),
  }
}

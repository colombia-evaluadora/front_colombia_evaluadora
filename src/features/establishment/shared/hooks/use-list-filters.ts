import { useFiltrosDeListado } from "@/features/assistant/lib/registro-ui"

export type ListFiltersForm<K extends string> = { search: string } & Record<K, string[]>

type ListFiltersPatch<K extends string> = { search: string | undefined } & Record<
  K,
  string[] | undefined
>

interface UseListFiltersOptions<K extends string> {
  /** Clave del filtro múltiple en la URL (p. ej. `statuses`, `zones`). */
  listKey: K
  search: string | undefined
  values: string[] | undefined
  /** Aplica el parche en la URL (debe reiniciar `page`). */
  setSearch: (patch: ListFiltersPatch<K>) => void
}

// Filtros de listado: búsqueda + un filtro múltiple, sincronizados con la URL.
export function useListFilters<K extends string>({
  listKey,
  search,
  values,
  setSearch,
}: UseListFiltersOptions<K>) {
  const applyFilters = (form: ListFiltersForm<K>) => {
    const list = form[listKey]
    setSearch({
      search: form.search || undefined,
      [listKey]: list.length ? list : undefined,
    } as ListFiltersPatch<K>)
  }

  const clearAllFilters = () => {
    setSearch({ search: undefined, [listKey]: undefined } as ListFiltersPatch<K>)
  }

  const activeFilterCount = (search ? 1 : 0) + (values?.length ?? 0)

  const filters = {
    search: search ?? "",
    [listKey]: values ?? [],
  } as ListFiltersForm<K>
  // UI asistida: `APLICAR_FILTROS` usa el mismo `applyFilters` que la persona.
  useFiltrosDeListado(filters, applyFilters)

  return { filters, applyFilters, clearAllFilters, activeFilterCount }
}

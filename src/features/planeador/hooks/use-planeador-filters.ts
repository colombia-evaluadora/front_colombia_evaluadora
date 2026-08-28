import { useCallback, useMemo } from "react"

import { planeadorRoute, planeadorUnidadesRoute } from "@/router"

import type {
  PlaneadorFiltersFormInput,
  PlaneadorFiltersFormValues,
} from "@/features/planeador/api/schema"

export interface PlaneadorFilters {
  filters: PlaneadorFiltersFormInput
  applyFilters: (values: PlaneadorFiltersFormValues) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

/**
 * Los filtros del Planeador viven en la URL, igual que en los demás
 * listados: la barra los escribe y los lee de ahí, así que la vista se puede
 * compartir por link y el botón atrás del navegador funciona solo.
 *
 * `actividad` (el detalle abierto) no se toca acá: es estado de la pantalla,
 * no un filtro, y se preserva porque `applyFilters` extiende el search
 * anterior en vez de reemplazarlo.
 */
/** Lo que el hook necesita de un search: los cuatro campos del formulario. */
interface FiltersSearch {
  buscar?: string
  filtro?: string
  estado?: string
  vista?: string
}

/**
 * El cuerpo del hook, parametrizado por el par search/navigate de la ruta.
 * Las dos pestañas del Planeador comparten la misma barra de filtros pero
 * viven en rutas distintas, y TanStack tipa `useSearch`/`useNavigate` por
 * ruta: pasarlos como argumentos evita duplicar el hook entero.
 */
function useFiltersFor(
  search: FiltersSearch,
  navigate: (opts: {
    search: (prev: Record<string, unknown>) => Record<string, unknown>
    replace?: boolean
  }) => void,
): PlaneadorFilters {

  const applyFilters = useCallback(
    (values: PlaneadorFiltersFormValues) => {
      navigate({
        search: (prev) => ({
          ...prev,
          buscar: values.buscar || undefined,
          filtro: values.filtro || undefined,
          estado: values.estado || undefined,
          vista: values.vista || undefined,
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
        buscar: undefined,
        filtro: undefined,
        estado: undefined,
        vista: undefined,
      }),
      replace: true,
    })
  }, [navigate])

  // `vista` no cuenta como filtro: no recorta el listado, solo cambia cómo se
  // agrupa, y si contara el embudo se vería activo de entrada.
  const activeFilterCount = useMemo(() => {
    let n = 0
    if (search.buscar) n += 1
    if (search.filtro) n += 1
    if (search.estado) n += 1
    return n
  }, [search.buscar, search.filtro, search.estado])

  return {
    filters: {
      buscar: search.buscar ?? "",
      filtro: search.filtro ?? "",
      estado: search.estado ?? "",
      vista: search.vista ?? "",
    },
    applyFilters,
    clearAllFilters,
    activeFilterCount,
  }
}

/** Filtros de la pestaña "Actividades". */
export function usePlaneadorFilters(): PlaneadorFilters {
  return useFiltersFor(planeadorRoute.useSearch(), planeadorRoute.useNavigate())
}

/** Filtros de la pestaña "Unidad temática". */
export function useUnidadesFilters(): PlaneadorFilters {
  return useFiltersFor(
    planeadorUnidadesRoute.useSearch(),
    planeadorUnidadesRoute.useNavigate(),
  )
}

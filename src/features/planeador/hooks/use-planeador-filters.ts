import { useCallback, useMemo } from "react"

import { planeadorRoute, planeadorUnidadesRoute } from "@/router"

import type {
  PlaneadorFiltersFormInput,
  PlaneadorFiltersFormValues,
} from "@/features/planeador/api/schema"
import type { PlaneadorAlcanceSeleccion } from "@/features/planeador/components/planeador-docente-selector"

export interface PlaneadorFilters {
  filters: PlaneadorFiltersFormInput
  /** Con `alcance` (popover de filtros avanzados) escribe también
   *  `?sede=&ano=&jornada=&docente=` en la misma navegación. */
  applyFilters: (values: PlaneadorFiltersFormValues, alcance?: PlaneadorAlcanceSeleccion) => void
  /** Solo sede/año/jornada/docente (chips, valores por defecto). */
  applyAlcance: (alcance: PlaneadorAlcanceSeleccion) => void
  clearAllFilters: () => void
  /** Incluye sede/año/jornada/docente elegidos. */
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
  sede?: number
  ano?: number
  jornada?: number
  docente?: number
}

/** `?sede=&ano=&jornada=&docente=` de un alcance, más el reseteo de lo que
 *  la pantalla eligió sobre el alcance anterior (`resetAlCambiarAlcance`). */
function alcanceSearch(
  prev: Record<string, unknown>,
  alcance: PlaneadorAlcanceSeleccion,
  resetAlCambiarAlcance: readonly string[],
): Record<string, unknown> {
  const cambio =
    prev.sede !== alcance.sede ||
    prev.ano !== alcance.ano ||
    prev.jornada !== alcance.jornada ||
    prev.docente !== alcance.docente
  return {
    sede: alcance.sede,
    ano: alcance.ano,
    jornada: alcance.jornada,
    docente: alcance.docente,
    ...(cambio ? Object.fromEntries(resetAlCambiarAlcance.map((k) => [k, undefined])) : {}),
  }
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
  /** Claves de la URL que dependen del docente/alcance (pestaña de rótulo,
   *  actividad o unidad abierta…): cambiar el alcance las borra. */
  resetAlCambiarAlcance: readonly string[],
): PlaneadorFilters {

  const applyFilters = useCallback(
    (values: PlaneadorFiltersFormValues, alcance?: PlaneadorAlcanceSeleccion) => {
      navigate({
        search: (prev) => ({
          ...prev,
          buscar: values.buscar || undefined,
          filtro: values.filtro || undefined,
          estado: values.estado || undefined,
          vista: values.vista || undefined,
          ...(alcance ? alcanceSearch(prev, alcance, resetAlCambiarAlcance) : {}),
        }),
        replace: true,
      })
    },
    [navigate, resetAlCambiarAlcance],
  )

  const applyAlcance = useCallback(
    (alcance: PlaneadorAlcanceSeleccion) => {
      navigate({
        search: (prev) => ({ ...prev, ...alcanceSearch(prev, alcance, resetAlCambiarAlcance) }),
        replace: true,
      })
    },
    [navigate, resetAlCambiarAlcance],
  )

  const clearAllFilters = useCallback(() => {
    navigate({
      search: (prev) => ({
        ...prev,
        buscar: undefined,
        filtro: undefined,
        estado: undefined,
        vista: undefined,
        ...alcanceSearch(prev, {}, resetAlCambiarAlcance),
      }),
      replace: true,
    })
  }, [navigate, resetAlCambiarAlcance])

  // `vista` no cuenta como filtro: no recorta el listado, solo cambia cómo se
  // agrupa, y si contara el embudo se vería activo de entrada.
  const activeFilterCount = useMemo(() => {
    let n = 0
    if (search.buscar) n += 1
    if (search.filtro) n += 1
    if (search.estado) n += 1
    for (const v of [search.sede, search.ano, search.jornada, search.docente]) {
      if (v != null) n += 1
    }
    return n
  }, [search.buscar, search.filtro, search.estado, search.sede, search.ano, search.jornada, search.docente])

  return {
    filters: {
      buscar: search.buscar ?? "",
      filtro: search.filtro ?? "",
      estado: search.estado ?? "",
      vista: search.vista ?? "",
    },
    applyFilters,
    applyAlcance,
    clearAllFilters,
    activeFilterCount,
  }
}

/** Lo que cada pestaña eligió sobre el docente anterior: cambiar el alcance
 *  lo invalida (cada docente tiene sus propias pestañas y actividades). */
const RESET_ACTIVIDADES = ["rotulo", "actividad", "modo"] as const
const RESET_UNIDADES = ["instrumento", "unidad"] as const

/** Filtros de la pestaña "Actividades". */
export function usePlaneadorFilters(): PlaneadorFilters {
  return useFiltersFor(planeadorRoute.useSearch(), planeadorRoute.useNavigate(), RESET_ACTIVIDADES)
}

/** Filtros de la pestaña "Unidad temática". */
export function useUnidadesFilters(): PlaneadorFilters {
  return useFiltersFor(
    planeadorUnidadesRoute.useSearch(),
    planeadorUnidadesRoute.useNavigate(),
    RESET_UNIDADES,
  )
}

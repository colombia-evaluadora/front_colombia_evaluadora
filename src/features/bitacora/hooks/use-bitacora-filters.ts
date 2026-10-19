import { subDays } from "date-fns"

import { formatDateValue } from "@/lib/date-value"
import { bitacoraRoute } from "@/router"

import { ESTABLECIMIENTOS } from "@/features/bitacora/api/mock-bitacora"
import type { BitacoraModulo } from "@/features/bitacora/api/types/bitacora"

/** Filtros en la forma del buscador (strings; vacío = sin filtro). */
export interface BitacoraFilters {
  modulo: BitacoraModulo
  q: string
  establecimiento: string
  sede: string
  jornada: string
  entidad: string
  accion: string[]
  desde: string
  hasta: string
}

/** Por defecto, los últimos 30 días. */
export function rangoPorDefecto() {
  const hoy = new Date()
  return { desde: formatDateValue(subDays(hoy, 30)), hasta: formatDateValue(hoy) }
}

/** Módulo, establecimiento y fechas son obligatorios: se cambian, pero no se quitan. */
export function filtrosVacios(): BitacoraFilters {
  return {
    modulo: "establecimiento",
    q: "",
    establecimiento: ESTABLECIMIENTOS[0]!.value,
    sede: "",
    jornada: "",
    entidad: "",
    accion: [],
    ...rangoPorDefecto(),
  }
}

export function useBitacoraFilters() {
  const search = bitacoraRoute.useSearch()
  const navigate = bitacoraRoute.useNavigate()
  const base = filtrosVacios()

  const filters: BitacoraFilters = {
    modulo: search.modulo ?? base.modulo,
    q: search.q ?? "",
    establecimiento: search.establecimiento ?? base.establecimiento,
    sede: search.sede ?? "",
    jornada: search.jornada ?? "",
    entidad: search.entidad ?? "",
    accion: search.accion ?? [],
    desde: search.desde ?? base.desde,
    hasta: search.hasta ?? base.hasta,
  }

  function applyFilters(values: BitacoraFilters) {
    navigate({
      search: (prev) => ({
        ...prev,
        modulo: values.modulo,
        q: values.q || undefined,
        establecimiento: values.establecimiento || undefined,
        sede: values.sede || undefined,
        jornada: values.jornada || undefined,
        entidad: values.entidad || undefined,
        accion: values.accion.length ? values.accion : undefined,
        desde: values.desde || undefined,
        hasta: values.hasta || undefined,
        page: 0,
      }),
      replace: true,
    })
  }

  // Los obligatorios no cuentan como filtro activo.
  const activeFilterCount = [filters.q, filters.sede, filters.jornada, filters.entidad].filter(Boolean).length +
    filters.accion.length

  return {
    filters,
    applyFilters,
    // Limpiar conserva módulo y establecimiento.
    clearAllFilters: () => applyFilters({ ...filtrosVacios(), modulo: filters.modulo, establecimiento: filters.establecimiento }),
    activeFilterCount,
  }
}

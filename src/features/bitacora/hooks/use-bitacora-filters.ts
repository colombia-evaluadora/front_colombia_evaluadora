import { paths } from "@/config/paths"
import { bitacoraModuloRoute } from "@/router"

import { BITACORA_MODULO_SLUG, moduloDeSlug } from "@/features/bitacora/api/types/bitacora"
import { accionPorDefecto, filtrosVacios, type BitacoraFilters } from "@/features/bitacora/lib/filtros-por-defecto"

export { accionPorDefecto, filtrosVacios, rangoPorDefecto, type BitacoraFilters } from "@/features/bitacora/lib/filtros-por-defecto"

/** Marca de «todas las acciones» en la URL (solo hace falta donde el valor por defecto no es «todas»). */
const TODAS = "TODAS"

export function useBitacoraFilters() {
  const search = bitacoraModuloRoute.useSearch()
  const navigate = bitacoraModuloRoute.useNavigate()
  // El módulo es el submenú (la ruta), no un filtro de la URL.
  const modulo = moduloDeSlug(bitacoraModuloRoute.useParams().modulo)
  const base = filtrosVacios()

  const filters: BitacoraFilters = {
    modulo,
    q: search.q ?? "",
    establecimiento: search.establecimiento ?? "",
    sede: search.sede ?? "",
    jornada: search.jornada ?? "",
    entidad: search.entidad ?? "",
    // Administración del Sistema abre en sus accesos (B.7.LIS.1). El router descarta las listas vacías de la
    // URL, así que «todas las acciones» se guarda como [TODAS].
    accion: search.accion?.includes(TODAS) ? [] : (search.accion ?? accionPorDefecto(modulo)),
    desde: search.desde ?? base.desde,
    hasta: search.hasta ?? base.hasta,
  }

  function applyFilters(values: BitacoraFilters) {
    navigate({
      // Otro módulo es otro submenú: se cambia de ruta y se conservan los filtros.
      to: paths.app.bitacoraModulo.getHref(BITACORA_MODULO_SLUG[values.modulo]),
      search: (prev) => ({
        ...prev,
        modulo: undefined,
        q: values.q || undefined,
        establecimiento: values.establecimiento || undefined,
        sede: values.sede || undefined,
        jornada: values.jornada || undefined,
        entidad: values.entidad || undefined,
        accion: values.accion.length ? values.accion : values.modulo === "ADMINISTRACION" ? [TODAS] : undefined,
        desde: values.desde || undefined,
        hasta: values.hasta || undefined,
        page: 0,
      }),
      replace: true,
    })
  }

  // Los obligatorios no cuentan como filtro activo.
  const activeFilterCount =
    [filters.q, filters.sede, filters.jornada, filters.entidad].filter(Boolean).length + filters.accion.length

  // Registros o Resumen por módulo: conserva los filtros y vuelve a la primera página.
  const vista = search.vista ?? "registros"
  const setVista = (v: "registros" | "resumen") =>
    navigate({ search: (prev) => ({ ...prev, vista: v === "registros" ? undefined : v, page: 0 }), replace: true })

  return {
    filters,
    vista,
    setVista,
    applyFilters,
    // Limpiar conserva módulo y establecimiento.
    clearAllFilters: () =>
      applyFilters({
        ...filtrosVacios(),
        modulo: filters.modulo,
        establecimiento: filters.establecimiento,
        accion: accionPorDefecto(filters.modulo),
      }),
    activeFilterCount,
  }
}

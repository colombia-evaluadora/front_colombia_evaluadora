import { subDays } from "date-fns"

import { formatDateValue } from "@/lib/date-value"
import type { BitacoraModulo } from "@/features/bitacora/api/types/bitacora"

// Fuera del hook para poder usarlos sin importar el router (la preparación sin conexión arma la misma key).

/** Filtros en la forma del buscador (strings; vacío = sin filtro). */
export interface BitacoraFilters {
  modulo: BitacoraModulo
  q: string
  /** pk del establecimiento; solo lo elige el Superadministrador. */
  establecimiento: string
  /** pk de la sede. */
  sede: string
  /** `pk_lista_valor` de la jornada. */
  jornada: string
  /** Código de la entidad. */
  entidad: string
  /** Códigos de acción (`MODIFICAR`, …). */
  accion: string[]
  desde: string
  hasta: string
}

/** Acción con que abre un módulo: Administración del Sistema, en sus accesos. */
export const accionPorDefecto = (modulo: BitacoraModulo): string[] => (modulo === "ADMINISTRACION" ? ["ACCESO"] : [])

/** Por defecto, los últimos 30 días. */
export function rangoPorDefecto() {
  const hoy = new Date()
  return { desde: formatDateValue(subDays(hoy, 30)), hasta: formatDateValue(hoy) }
}

/** Módulo, establecimiento y fechas son obligatorios: se cambian, pero no se quitan. */
export function filtrosVacios(): BitacoraFilters {
  return {
    modulo: "ESTABLECIMIENTO",
    q: "",
    establecimiento: "",
    sede: "",
    jornada: "",
    entidad: "",
    accion: [],
    ...rangoPorDefecto(),
  }
}

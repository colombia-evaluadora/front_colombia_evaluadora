import type { InformesSearch } from "@/features/coverage/informes-reportes/api/schema"

/** Estado por defecto de la estadística (Sección 3.9): Cursando. */
export const ESTADOS_EDADES_DEFECTO = ["Cursando"]

const lista = <T,>(v: T[] | undefined) => (v?.length ? v : null)

/** Filtros de la estadística; los reusa el export de estudiantes. Lista vacía o ausente = todos. */
export const filtrosEdades = (s: InformesSearch) => ({
  PERIODOS: lista(s.ePeriodos),
  SEDES: lista(s.eSedes),
  JORNADAS: lista(s.eJornadas),
  GRADOS: lista(s.eGrados),
  ESTADOS: s.eEstados === undefined ? ESTADOS_EDADES_DEFECTO : lista(s.eEstados),
  TIPOS: lista(s.eTipos),
  METODOLOGIAS: lista(s.eMetodologias),
  AGRUPAR: s.agrupar ?? "GRADO",
  GRUPO: s.grupoEdad ?? null,
})

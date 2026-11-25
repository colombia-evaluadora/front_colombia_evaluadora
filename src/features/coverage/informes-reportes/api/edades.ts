import type { InformesSearch } from "@/features/coverage/informes-reportes/api/schema"

/** Filtros de la estadística; los reusa el export de estudiantes. */
export const filtrosEdades = (s: InformesSearch) => ({
  PERIODO: s.periodo ?? null,
  SEDE: s.sede || null,
  JORNADA: s.jornada || null,
  GRADOS: s.grado != null ? [s.grado] : null,
  ESTADOS: s.estado ? [s.estado] : null,
  AGRUPAR: s.agrupar ?? "GRADO",
  GRUPO: s.grupoEdad ?? null,
})

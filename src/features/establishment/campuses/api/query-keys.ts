const all = ["campuses"] as const
const detalle = (id: number | string | null | undefined) => [...all, id] as const

export const campusKeys = {
  all,
  lista: <P>(params: P) => [...all, params] as const,
  detalle,
  /** Catálogo de especialidades de la sede: cuelga del detalle. */
  especialidades: (id: number | null | undefined) => [...detalle(id), "especialidades"] as const,
  options: () => [...all, "options"] as const,
  /** Sedes de un establecimiento (para advertir un nombre repetido). */
  porEstablecimiento: (establishmentId: number | null | undefined) =>
    [...all, "por-establecimiento", establishmentId] as const,
  consecutivo: (establishmentId: number | null | undefined) => [...all, "consecutivo", establishmentId] as const,
  /** Lista general de especialidades: no depende de ninguna sede. */
  catalogoEspecialidades: () => ["especialidades-sede-catalogo"] as const,
  zonas: (establishmentId: number | null | undefined) => ["zonas-sede", establishmentId] as const,
} as const

const all = ["campuses"] as const

export const campusKeys = {
  all,
  lista: <P>(params: P) => [...all, params] as const,
  detalle: (id: number | string | null | undefined) => [...all, id] as const,
  options: () => [...all, "options"] as const,
  zonas: (establishmentId: number | null | undefined) => ["zonas-sede", establishmentId] as const,
} as const

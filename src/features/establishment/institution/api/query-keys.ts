const all = ["establishments"] as const

export const establishmentKeys = {
  all,
  lista: <P>(params: P) => [...all, params] as const,
  detalle: (id: number | string | null | undefined) => [...all, id] as const,
  options: () => [...all, "options"] as const,
  permisoDirectivos: () => [...all, "permiso-directivos"] as const,
} as const

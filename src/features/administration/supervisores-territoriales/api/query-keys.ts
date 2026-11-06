const all = ["supervisores-territoriales"] as const

export const supervisorKeys = {
  all,
  lista: [...all, "lista"] as const,
  detalle: (id: number) => [...all, "detalle", id] as const,
  catalogos: [...all, "catalogos"] as const,
} as const

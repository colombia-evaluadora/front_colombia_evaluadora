const all = ["administradores-territoriales"] as const

export const administradorKeys = {
  all,
  lista: [...all, "lista"] as const,
  detalle: (id: number) => [...all, "detalle", id] as const,
  catalogos: [...all, "catalogos"] as const,
} as const

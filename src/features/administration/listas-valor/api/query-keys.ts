const all = ["listas-valor"] as const

export const listaValorKeys = {
  all,
  categorias: [...all, "categorias"] as const,
  valores: (categoria: string | "none") => [...all, "valores", categoria] as const,
  iconos: [...all, "iconos"] as const,
} as const

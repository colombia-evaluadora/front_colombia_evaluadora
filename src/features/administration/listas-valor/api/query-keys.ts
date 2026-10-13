const all = ["listas-valor"] as const

export const listaValorKeys = {
  all,
  categorias: [...all, "categorias"] as const,
  valores: (categoria: string | "none") => [...all, "valores", categoria] as const,
} as const

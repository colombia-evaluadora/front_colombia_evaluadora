const all = ["conservacion-datos"] as const
const vencidos = [...all, "vencidos"] as const

export const conservacionKeys = {
  all,
  config: [...all, "config"] as const,
  modulos: [...all, "modulos"] as const,
  politicas: [...all, "politicas"] as const,
  politica: (id: number | "none") => [...all, "politicas", id] as const,
  ampliaciones: (pkEstablecimiento: number | null) => [...all, "ampliaciones", pkEstablecimiento] as const,
  vencidos,
  detalleVencido: (pkPolitica: number, pkEstablecimiento: number) =>
    [...vencidos, pkPolitica, pkEstablecimiento] as const,
  archivo: <P>(params: P) => [...all, "archivo", params] as const,
} as const

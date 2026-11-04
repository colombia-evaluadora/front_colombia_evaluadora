const all = ["observador"] as const
const detalle = (id: number | "none") => [...all, "detalle", id] as const

export const observadorKeys = {
  all,
  lista: <P>(params: P) => [...all, "lista", params] as const,
  detalle,
  codigos: (establecimientoId: number | "none") => [...all, "codigos", establecimientoId] as const,
} as const

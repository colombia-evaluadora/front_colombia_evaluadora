const all = ["convivencia"] as const

export const convivenciaKeys = {
  all,
  lista: <P>(params: P) => [...all, "lista", params] as const,
  detalle: (id: number | "none") => [...all, "detalle", id] as const,
  pasos: (id: number | "none") => [...all, "pasos", id] as const,
  gestores: (id: number | "none") => [...all, "gestores", id] as const,
  funcionarios: <P>(params: P) => [...all, "funcionarios", params] as const,
  gestorPrevisto: (tipo: number | "none", matriculas: number[]) => [...all, "gestor-previsto", tipo, matriculas] as const,
} as const

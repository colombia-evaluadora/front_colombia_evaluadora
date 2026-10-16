const all = ["areas-oficiales"] as const

export const areaOficialKeys = {
  all,
  lista: [...all, "lista"] as const,
  /** Selectores (Referente): solo activas, opcionalmente de un nivel. */
  opciones: (nivel: number | "todos") => [...all, "opciones", nivel] as const,
} as const

const all = ["festivos"] as const

export const festivoKeys = {
  all,
  lista: [...all, "lista"] as const,
} as const

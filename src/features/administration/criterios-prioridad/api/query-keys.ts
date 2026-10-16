const all = ["criterios-prioridad"] as const

export const criterioPrioridadKeys = {
  all,
  lista: [...all, "lista"] as const,
  /** Bloques y campos evaluables con sus reglas: cambia con la Lista de Valores. */
  campos: [...all, "campos"] as const,
} as const

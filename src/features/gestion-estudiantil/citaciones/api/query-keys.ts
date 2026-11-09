const all = ["citaciones-compromisos"] as const
const citaciones = [...all, "citaciones"] as const
const compromisos = [...all, "compromisos"] as const

/**
 * Citaciones y compromisos comparten raíz: crear un compromiso desde una citación Asistió o una
 * transición de estado refresca ambos listados con una sola invalidación (`all`).
 */
export const citacionesKeys = {
  all,
  citaciones: {
    all: citaciones,
    lista: <P>(params: P) => [...citaciones, "lista", params] as const,
    detalle: (id: number | "none") => [...citaciones, "detalle", id] as const,
    documento: (id: number | "none") => [...citaciones, "documento", id] as const,
  },
  compromisos: {
    all: compromisos,
    lista: <P>(params: P) => [...compromisos, "lista", params] as const,
    detalle: (id: number | "none") => [...compromisos, "detalle", id] as const,
    documento: (id: number | "none") => [...compromisos, "documento", id] as const,
  },
} as const

const all = ["observaciones-sugerencias"] as const

/** Toda escritura invalida la raíz: refresca el listado y el detalle. */
export const observacionesKeys = {
  all,
  lista: <P>(params: P) => [...all, "lista", params] as const,
  detalle: (id: number | "none") => [...all, "detalle", id] as const,
  resumen: <P>(params: P) => [...all, "resumen", params] as const,
  opciones: {
    grupos: <P>(params: P) => [...all, "opciones", "grupos", params] as const,
    estudiantes: <P>(params: P) => [...all, "opciones", "estudiantes", params] as const,
  },
} as const

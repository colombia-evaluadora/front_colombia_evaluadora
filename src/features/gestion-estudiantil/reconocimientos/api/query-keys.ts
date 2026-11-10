const all = ["reconocimientos"] as const

/** Toda escritura invalida la raíz: refresca listado, sugerencias (una otorgada sale de la lista) y detalle. */
export const reconocimientosKeys = {
  all,
  lista: <P>(params: P) => [...all, "lista", params] as const,
  detalle: (id: number | "none") => [...all, "detalle", id] as const,
  mencion: (id: number | "none") => [...all, "mencion", id] as const,
  sugerencias: <P>(params: P) => [...all, "sugerencias", params] as const,
  opciones: {
    estudiantes: <P>(params: P) => [...all, "opciones", "estudiantes", params] as const,
    otorgantes: <P>(params: P) => [...all, "opciones", "otorgantes", params] as const,
  },
  actividades: <P>(params: P) => [...all, "actividades", params] as const,
} as const

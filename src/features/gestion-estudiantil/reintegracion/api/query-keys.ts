const all = ["reintegracion"] as const

/** Toda escritura invalida la raíz: bandeja, detalle, intervenciones y remisiones cambian juntos. */
export const reintegracionKeys = {
  all,
  casos: <P>(params: P) => [...all, "casos", params] as const,
  caso: (id: number | "none") => [...all, "caso", id] as const,
  permisos: (establecimiento: number | "none") => [...all, "permisos", establecimiento] as const,
  intervenciones: (caso: number | "none") => [...all, "intervenciones", caso] as const,
  intervencion: (caso: number | "none", intervencion: number | "none") =>
    [...all, "intervencion", caso, intervencion] as const,
  remisiones: (caso: number | "none") => [...all, "remisiones", caso] as const,
  remisionExterna: (id: number | "none") => [...all, "remision-externa", id] as const,
  plazo: (establecimiento: number | "none") => [...all, "plazo", establecimiento] as const,
  opciones: {
    matriculas: <P>(params: P) => [...all, "opciones", "matriculas", params] as const,
    profesionales: (sede: number | "none", jornada: number | "none") =>
      [...all, "opciones", "profesionales", sede, jornada] as const,
    lista: (lista: string) => [...all, "opciones", "lista", lista] as const,
    funcionarios: <P>(params: P) => [...all, "opciones", "funcionarios", params] as const,
    razones: [...all, "opciones", "razones"] as const,
  },
} as const

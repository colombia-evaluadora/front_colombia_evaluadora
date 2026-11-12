const all = ["prevencion"] as const

/** Toda escritura invalida la raíz: tablero, listado, historial, plan y alertas cambian juntos. */
export const prevencionKeys = {
  all,
  tablero: <P>(params: P) => [...all, "tablero", params] as const,
  historial: (matricula: number | "none") => [...all, "historial", matricula] as const,
  alertas: (matricula: number | "none") => [...all, "alertas", matricula] as const,
  valoraciones: <P>(params: P) => [...all, "valoraciones", params] as const,
  valoracion: (id: number | "none") => [...all, "valoracion", id] as const,
  plan: (id: number | "none") => [...all, "plan", id] as const,
  planSoporte: (id: number | "none") => [...all, "plan-soporte", id] as const,
  saludMental: <P>(params: P) => [...all, "salud-mental", params] as const,
  acceso: (establecimiento: number | "none") => [...all, "acceso", establecimiento] as const,
  senalSM: (id: number | "none") => [...all, "senal-sm", id] as const,
  parametros: (establecimiento: number | "none") => [...all, "parametros", establecimiento] as const,
  indicadores: <P>(params: P) => [...all, "indicadores", params] as const,
  indicadoresGestion: <P>(params: P) => [...all, "indicadores-gestion", params] as const,
  opciones: {
    estudiantes: <P>(params: P) => [...all, "opciones", "estudiantes", params] as const,
    estudiantesSaludMental: <P>(params: P) => [...all, "opciones", "estudiantes-sm", params] as const,
    estrategias: (matricula: number | "none") => [...all, "opciones", "estrategias", matricula] as const,
    responsables: <P>(params: P) => [...all, "opciones", "responsables", params] as const,
    grupos: <P>(params: P) => [...all, "opciones", "grupos", params] as const,
    periodos: <P>(params: P) => [...all, "opciones", "periodos", params] as const,
    periodosAcademicos: (establecimiento: number | "none") =>
      [...all, "opciones", "periodos-academicos", establecimiento] as const,
    motivosRetiro: [...all, "opciones", "motivos-retiro"] as const,
    sedesJornadas: (establecimiento: number | "todos") => [...all, "opciones", "sedes-jornadas", establecimiento] as const,
  },
} as const

const all = ["asistencia"] as const

export const asistenciaKeys = {
  all,
  aprobaciones: () => [...all, "aprobaciones"] as const,
  calendario: <P>(params: P) => [...all, "calendario", params] as const,
  // Regla 115: la planilla diaria cuelga de su propio prefijo.
  diaria: {
    all: () => [...all, "diaria"] as const,
    calendario: <P>(params: P) => [...all, "diaria", "calendario", params] as const,
    planilla: <P>(params: P) => [...all, "diaria", "planilla", params] as const,
    bloques: <P>(params: P) => [...all, "diaria", "bloques", params] as const,
    porGrupo: <P>(params: P) => [...all, "diaria", "por-grupo", params] as const,
    grupos: <P>(params: P) => [...all, "diaria", "grupos", params] as const,
  },
  diasInhabiles: <P>(params: P) => [...all, "dias-inhabiles", params] as const,
  porGrupo: <P>(params: P) => [...all, "por-grupo", params] as const,
  porGrupoPeriodos: <P>(grupo: P) => [...all, "por-grupo", "periodos", grupo] as const,
  porGrupoRotulo: <P>(grupo: P) => [...all, "por-grupo", "rotulo", grupo] as const,
  resumenHoras: <P>(params: P) => [...all, "resumen-horas", params] as const,
  sesionEstudiantes: <P>(params: P) => [...all, "sesion-estudiantes", params] as const,
} as const

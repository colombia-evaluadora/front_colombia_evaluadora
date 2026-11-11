const all = ["asistencia"] as const

export const asistenciaKeys = {
  all,
  aprobaciones: () => [...all, "aprobaciones"] as const,
  calendario: <P>(params: P) => [...all, "calendario", params] as const,
  diasInhabiles: <P>(params: P) => [...all, "dias-inhabiles", params] as const,
  porGrupo: <P>(params: P) => [...all, "por-grupo", params] as const,
  porGrupoPeriodos: <P>(grupo: P) => [...all, "por-grupo", "periodos", grupo] as const,
  porGrupoRotulo: <P>(grupo: P) => [...all, "por-grupo", "rotulo", grupo] as const,
  resumenHoras: <P>(params: P) => [...all, "resumen-horas", params] as const,
  sesionEstudiantes: <P>(params: P) => [...all, "sesion-estudiantes", params] as const,
} as const

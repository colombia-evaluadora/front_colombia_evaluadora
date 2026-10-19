const all = ["asistencia"] as const

export const asistenciaKeys = {
  all,
  aprobaciones: () => [...all, "aprobaciones"] as const,
  calendario: <P>(params: P) => [...all, "calendario", params] as const,
  resumenHoras: <P>(params: P) => [...all, "resumen-horas", params] as const,
  sesionEstudiantes: <P>(params: P) => [...all, "sesion-estudiantes", params] as const,
  seguimiento: <P>(body: P) => [...all, "seguimiento", body] as const,
} as const

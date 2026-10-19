const all = ["employees"] as const

export const employeeKeys = {
  all,
  lista: <P>(params: P) => [...all, params] as const,
  detalle: (id: number | string | null | undefined) => [...all, id] as const,
  estadoCuenta: (correos: string[]) => ["funcionarios-estado-cuenta", correos] as const,
  estadoCuentaAll: ["funcionarios-estado-cuenta"] as const,
} as const

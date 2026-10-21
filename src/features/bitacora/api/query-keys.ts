const all = ["bitacora"] as const

export const bitacoraKeys = {
  all,
  lista: <P>(params: P) => [...all, "lista", params] as const,
  estado: (ids: string[]) => [...all, "estado", ids] as const,
  entidades: (modulo: string) => [...all, "entidades", modulo] as const,
  sedes: () => [...all, "sedes"] as const,
  vistaPrevia: (id: string) => [...all, "vista-previa", id] as const,
} as const

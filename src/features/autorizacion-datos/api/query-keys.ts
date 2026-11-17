const all = ["autorizacion-datos"] as const

export const autorizacionDatosKeys = {
  all,
  pendientes: [...all, "pendientes"] as const,
} as const

const all = ["superadministradores"] as const

export const superadministradorKeys = {
  all,
  lista: [...all, "lista"] as const,
  tiposDocumento: [...all, "tipos-documento"] as const,
} as const

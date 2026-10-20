const all = ["superadministradores"] as const

export const superadministradorKeys = {
  all,
  lista: [...all, "lista"] as const,
  tiposDocumento: [...all, "tipos-documento"] as const,
  /** Autocompletado del alta: persona existente por tipo y número de documento. */
  persona: (tipo: number, numero: string) => [...all, "persona", tipo, numero] as const,
} as const
